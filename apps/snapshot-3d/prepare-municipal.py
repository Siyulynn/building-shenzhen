"""Compile the September baseline's municipal GIS draft, without importing it into the renderer."""
import argparse
from collections import Counter
from hashlib import sha256
from heapq import heappop, heappush
from itertools import combinations
import json
from math import ceil, floor, hypot
from pathlib import Path

import cv2
import numpy as np
import rasterio
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from scipy.ndimage import gaussian_filter, label, map_coordinates, maximum_filter, minimum_filter
from shapely.geometry import LineString, Point, Polygon, box, mapping, shape
import yaml

APP = Path(__file__).resolve().parent
ROOT = APP.parents[4]
PICKS = APP/"basemap/municipal-picks.json"
CORE = APP/"core-basin-gis.json"
REVIEW_ONLY = {"kcr-buji-pinghu", "kcr-north-continuation"}
SECTORS = {
    "west_lowlands": (60, 110, 190, 380), "nantou_shekou": (125, 335, 235, 465),
    "core_west_collar": (270, 350, 344, 428), "core_north_to_buji": (350, 305, 430, 365),
    "buji_to_north": (355, 145, 455, 305), "east_and_northeast": (445, 125, 800, 380),
}
LEGEND = {0:"Observed comparator land", 1:"Sea-connected lowland water", 2:"Possible intertidal or changed nearshore",
          3:"Reservoir component", 4:"Isolated lowland water candidate", 255:"Unknown / shadow / no observation"}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+"\n",encoding="utf-8")


def array(path, dtype, w, h, count=None, offset=0):
    return np.fromfile(path,dtype=dtype,count=w*h if count is None else count,offset=offset).reshape(h,w)


def water_classes(water, elev, modern, specs):
    low = (water==1)&(elev<=20)
    coastal, _ = label(low)
    # Only connect to obvious offshore samples. Seed areas are wide and deliberately away
    # from shore. Do not flood across MSS no-data or inferred modern fill.
    offshore = [(56,389),(266,470),(577,383)]
    sea_ids = {int(coastal[r,c]) for c,r in offshore} - {0}
    assert len(sea_ids) >= 2, "Offshore controls missing"
    sea = np.isin(coastal,list(sea_ids))
    out = np.full(water.shape,255,np.uint8)
    out[water==0] = 0
    out[low&~sea] = 4
    out[sea] = 1
    # A comparison flag, not proof of tide, shoreline position, or a reclamation date.
    possible = (water==0)&(modern==1)&(elev<=5)&(maximum_filter(sea,size=5)>0)
    out[possible] = 2
    rows = []
    for spec in specs:
        c0,r0,c1,r1 = spec["search"]
        c,r = spec["cell"]
        assert 0<=c0<c<c1<water.shape[1] and 0<=r0<r<r1<water.shape[0], spec["id"]
        inside = np.s_[r0:r1+1,c0:c1+1]
        components, _ = label(water[inside]==1)
        component = components[r-r0,c-c0]
        mask = components==component
        assert component and mask.sum()>100 and not sea[inside][mask].any(), spec["id"]
        if spec["id"]!="shenzhen-reservoir": # the original core comparator has its own reviewed window
            assert not (mask[[0,-1],:].any() or mask[:,[0,-1]].any()), (spec["id"],"search clips comparator component")
        assert not (out[inside][mask]==3).any(), spec["id"]
        out[inside][mask] = 3
        rows.append(dict(spec,cells=int(mask.sum()),source="landsat_1979_10_19"))
    return out, offshore, rows


def terrain_candidate(guide, width, west, north, step, heights, hydro, rail):
    """A coarse visual route candidate inside a documented search corridor, not railway engineering."""
    w,s,e,n=guide.bounds
    x0,z0=max(0,int((w-west-width)//step)),max(0,int((north-n-width)//step))
    x1,z1=min(heights.shape[1],int((e-west+width)//step)+1),min(heights.shape[0],int((north-s+width)//step)+1)
    win=heights[z0:z1,x0:x1]
    z,x=np.indices(win.shape)
    from shapely import distance, points
    dev=distance(guide,points(west+(x+x0+.5)*step,north-(z+z0+.5)*step))
    wet=hydro[z0:z1,x0:x1]
    broad_sea=minimum_filter((hydro==1).astype(np.uint8),size=5)[z0:z1,x0:x1]
    def snap(p):
        return int((north-p[1])//step)-z0,int((p[0]-west)//step)-x0
    start,end=map(snap,[guide.coords[0],guide.coords[-1]])
    best={start:0.}; prior={}
    queue=[(hypot(start[0]-end[0],start[1]-end[1]),0.,start)]
    while queue:
        _,s,current=heappop(queue)
        if current==end: break
        if s>best[current]: continue
        a,b=current
        for da,db in ((-1,0),(0,-1),(1,0),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)):
            i,j=a+da,b+db
            if not (0<=i<win.shape[0] and 0<=j<win.shape[1]): continue
            if not np.isfinite(win[i,j]) or ((i,j)!=end and (dev[i,j]>width or broad_sea[i,j] or wet[i,j]==3)): continue
            d=hypot(da,db)
            grade=abs(win[i,j]-win[a,b])/(step*d)
            penalty=(grade/(.032 if rail else .085))**2+1.1*(dev[i,j]/width)**2
            if wet[i,j] in (1,2,4): penalty+=8
            v=s+d*(1+penalty)
            if v>=best.get((i,j),float("inf")): continue
            best[i,j]=v; prior[i,j]=current
            heappush(queue,(v+hypot(i-end[0],j-end[1]),v,(i,j)))
    if end not in best:
        return None
    chain=[end]
    while chain[-1]!=start: chain.append(prior[chain[-1]])
    pts=[(west+(j+x0+.5)*step,north-(i+z0+.5)*step) for i,j in reversed(chain)]
    # Keep the exact guide portals, not the snapped centres of their raster cells.
    full=LineString([guide.coords[0],*pts[1:-1],guide.coords[-1]])
    simple=full.simplify(45)
    corridor=guide.buffer(width)
    if corridor.covers(simple): return simple
    return full if corridor.covers(full) else None


def screen_native_rail(line, width, dsm_paths, crs, west, north, hydro):
    """Compare the rendered band centre and an in-band terrain-only candidate.
    This test cannot locate the historical rails or measure their grade."""
    w,s,e,n=line.buffer(width+180).bounds
    step=30
    left,top=floor(w/step)*step,ceil(n/step)*step
    heights=np.full((ceil((top-s)/step),ceil((e-left)/step)),np.nan,np.float32)
    transform=from_origin(left,top,step,step)
    for path in dsm_paths:
        with rasterio.open(path) as ds:
            reproject(rasterio.band(ds,1),heights,dst_crs=crs,dst_transform=transform,
                      dst_nodata=np.nan,init_dest_nodata=False,resampling=Resampling.bilinear)
    assert np.isfinite(heights).all(), "Incomplete native DSM rail window"
    rr,cc=np.indices(heights.shape)
    wet=hydro[((north-top+(rr+.5)*step)//100).astype(int),((left-west+(cc+.5)*step)//100).astype(int)]
    smooth=gaussian_filter(heights,1.0)
    candidate=terrain_candidate(line,width,left,top,step,smooth,wet,True)

    def profile(path):
        metres=np.linspace(0,path.length,ceil(path.length/30)+1)
        xy=np.array([path.interpolate(d).coords[0] for d in metres])
        y=map_coordinates(smooth,[(top-xy[:,1])/step-.5,(xy[:,0]-left)/step-.5],order=1)
        rise=np.abs(y[7:]-y[:-7])*100/(metres[7:]-metres[:-7])
        i=int(rise.argmax())
        return {"km":round(path.length/1000,2),"pct95_210m_surface_slope":round(float(np.percentile(rise,95)),1),
                "max_210m_surface_slope":round(float(rise[i]),1),"steepest_utm":xy[i+3].round().astype(int).tolist()}

    return {"band_centre":profile(line),"terrain_only_candidate":profile(candidate) if candidate else None,
            "decision":"retain original review band; modern surface cannot establish period alignment or grade"}


def review_plate(out, extent, elev, water, rows, core, reservoirs):
    w,h = elev.shape[1],elev.shape[0]
    dark = np.clip(elev,0,410)*.25
    img = np.clip(np.array([184,207,213])[None,None,:]-dark[:,:,None],0,255).astype(np.uint8)
    for k,col in {1:(151,112,70),2:(169,152,122),3:(163,126,73),4:(146,149,102)}.items():
        img[water==k]=col
    missing=water==255
    img[missing] = (img[missing].astype(float)*.65+np.array([178,172,160])*.35).astype(np.uint8)
    rr,cc=np.ogrid[:h,:w]
    hatch=missing&((rr+cc)%9<1)
    img[hatch]=(img[hatch].astype(float)*.90).astype(np.uint8)
    p = cv2.resize(img,(w*2,h*2),interpolation=cv2.INTER_LINEAR)
    west,_,_,north = extent.bounds
    uv = lambda q: np.rint((np.array(q)-[west,north])/[50,-50]).astype(np.int32)
    bounds=core["bounds"]
    cb=uv([[bounds[0],bounds[3]],[bounds[2],bounds[1]]])
    cv2.rectangle(p,tuple(cb[0]),tuple(cb[1]),(250,250,241),2)
    colours = {"rail":(135,44,28),"road":(48,86,186),"river":(243,184,58),"settlement":(151,78,137),"field":(63,150,117)}
    for f in core["layers"]["alignments"]:
        ink=colours.get(f["kind"],colours["river"])
        cv2.polylines(p,[uv(f["geometry"]["coordinates"])],False,ink,1,cv2.LINE_AA)
    for f in rows:
        g=shape(f["geometry"])
        q=uv(g.coords if g.geom_type=="LineString" else g.exterior.coords)
        if f["basis"]=="estimated":
            colour=colours[f["kind"]] if f["render_status"]!="review_required" else (43,127,226)
            for a,b in zip(q,q[1:]):
                d=np.linalg.norm(b-a)
                for x in np.arange(0,d,12):
                    u=np.rint(a+(b-a)*x/d).astype(int)
                    v=np.rint(a+(b-a)*min((x+8)/d,1)).astype(int)
                    cv2.line(p,u,v,colour,3,cv2.LINE_AA)
        else:
            cv2.polylines(p,[q],g.geom_type=="Polygon",colours[f["kind"]],2,cv2.LINE_AA)
    for row in reservoirs:
        c,r=row["cell"]
        cv2.putText(p,row["name"][0].split(" Reservoir")[0],(c*2+12,r*2+4),
                    cv2.FONT_HERSHEY_SIMPLEX,.46,(80,46,33),1,cv2.LINE_AA)
    cv2.rectangle(p,(20,20),(1070,112),(32,37,40),cv2.FILLED)
    cv2.putText(p,"September 1980 municipal draft | Review only; not a period map",
                (30,47),cv2.FONT_HERSHEY_SIMPLEX,.70,(255,255,255),1,cv2.LINE_AA)
    cv2.putText(p,"Dashed: estimated rail / road (orange: profile review)   |   White box: core",
                (30,74),cv2.FONT_HERSHEY_SIMPLEX,.61,(255,255,255),1,cv2.LINE_AA)
    cv2.putText(p,"Blue: October 1979 water candidates   |   Hatching: missing or ambiguous water data",
                (30,99),cv2.FONT_HERSHEY_SIMPLEX,.61,(255,255,255),1,cv2.LINE_AA)
    assert cv2.imwrite(str(out),p)


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--research",type=Path,default=ROOT)
    args.add_argument("--out",type=Path,default=APP.parents[2]/"georef/municipal-step4c")
    a=args.parse_args()
    grid=a.research/"apps/map-spike/public/grid"
    meta=load(grid/"meta.json")
    w,h,step=meta["width"],meta["height"],meta["cell_m"]
    west,north=meta["origin_top_left"]
    assert (w,h,step,meta["crs"]) == (931,686,100,"EPSG:32650")
    picks,core=load(PICKS),load(CORE)
    a.out.mkdir(parents=True,exist_ok=True)
    claim_ids=set()
    inventories=(APP.parents[1]/"data/evidence",a.research/"data/evidence")
    for evidence in inventories:
        for f in (evidence/"claims").glob("*.yaml"):
            claim_ids.update(r["id"] for r in (yaml.safe_load(f.read_text(encoding="utf8")) or []))
    for s in picks["sources"].values():
        assert ("id" in s and any((d/"sources"/(s["id"]+".yaml")).is_file() for d in inventories)) or "url" in s, s
    extent=box(west,north-h*step,west+w*step,north)
    corebox=box(*core["bounds"])
    corelines={r["id"]:r["geometry"]["coordinates"] for r in core["layers"]["alignments"]}
    def utm(p):
        if isinstance(p, dict):
            return tuple(corelines[p["core"]][0 if p["end"]=="start" else -1])
        return (west+p[0]*step,north-p[1]*step)
    img=cv2.imread(str(grid/"kh9_1980.png"),cv2.IMREAD_UNCHANGED)
    assert img.shape==(h*4,w*4,4)
    kh9=(img[2::4,2::4,3]>0)
    for sector,(l,t,r,b) in SECTORS.items():
        assert 0<=l<r<=w and 0<=t<b<=h, sector
    water=array(grid/"water1979.bin",np.uint8,w,h)
    elev=array(grid/"grid.bin","<i2",w,h)
    modern=array(grid/"grid.bin",np.uint8,w,h,offset=2*w*h)
    reservoir=load(APP/"basin-gen.json")["reservoir"]
    specs=[dict(id="shenzhen-reservoir",name=["Shenzhen Reservoir","深圳水库"],
                cell=reservoir["cell"],search=reservoir["search_cells"],claims=["site.shenzhen_reservoir.exists_1979"]),
           *picks["reservoirs"]]
    assert all(set(row["claims"])<=claim_ids for row in specs)
    hydro, seeds, reservoirs=water_classes(water,elev,modern,specs)
    smooth_dsm=gaussian_filter(elev.astype(float),1.2)
    terrain_review={"kcr-buji-pinghu","kcr-north-continuation","guangshen-northwest"}
    shore_path=a.out/"municipal-water-context-oct1979.tif"
    with rasterio.open(shore_path,"w",driver="GTiff",width=w,height=h,count=1,dtype="uint8",crs=meta["crs"],
                       transform=from_origin(west,north,step,step),nodata=255,compress="deflate") as ds:
        ds.write(hydro,1)
        ds.update_tags(date="1979-10-19",source="landsat_1979_10_19",status="lead",legend=json.dumps(LEGEND),
                       caution="Candidate water context, not September 1980 or January 1984 shoreline or water levels")
    features, terrain_flags, ends = [], {}, {}
    for mode in ("lines","areas"):
        for row in picks[mode]:
            assert set(row["claims"])<=claim_ids and set(row["sources"])<=set(picks["sources"]),row["id"]
            assert row["reason"] and len(row["name"])==2 and all(row["name"])
            if row["basis"]=="estimated":
                assert row["claims"] and row["searchHalfWidthM"]>0
            path=[utm(p) for p in row["points"]]
            geom=(LineString if mode=="lines" else Polygon)(path)
            assert geom.is_valid and geom.is_simple and extent.covers(geom),row["id"]
            overlap=geom.intersection(corebox)
            assert (overlap.length if mode=="lines" else overlap.area)<.01,row["id"]
            choice="manual_image_or_county_guide"
            if mode=="lines":
                if row["id"] in terrain_review:
                    candidate=terrain_candidate(geom,row["searchHalfWidthM"],west,north,step,smooth_dsm,hydro,row["kind"]=="rail")
                    if candidate is not None and candidate.is_simple and candidate.intersection(corebox).length < .01:
                        geom,choice=candidate,"terrain_adjusted_within_search_corridor"
                    else:
                        choice="terrain_constraint_unresolved"
                ends[row["id"]]=[geom.coords[0],geom.coords[-1]]
                assert ends[row["id"]]==[path[0],path[-1]],row["id"]
                s=np.linspace(0,geom.length,max(3,int(geom.length/70)+1))
                cr=np.array([((p.x-west)//step,(north-p.y)//step) for p in (geom.interpolate(d) for d in s)],int)
                cols,rs=cr.T
                heights=smooth_dsm[rs,cols]
                bins=hydro[rs,cols]
                longgrade=np.abs(heights[3:]-heights[:-3])/(s[3:]-s[:-3])*100
                # Interior of broad deep water is a blocker. Narrow sea-connected pixels in valleys
                # are flags for crossing review rather than presumed bridge sites.
                certainly_wet=minimum_filter((hydro==1).astype(np.uint8),size=5)
                bad=int(certainly_wet[rs,cols].sum())
                assert row["kind"]=="river" or bad==0, (row["id"],"crosses a broad sea candidate")
                max_grade=round(float(longgrade.max()),1) if len(longgrade) else None
                terrain_flags[row["id"]]={"km":round(geom.length/1000,2),
                    "kh9_raster_share":round(float(kh9[rs,cols].mean()),3),
                    "max_smoothed_dsm_slope_pct_210m":max_grade,
                    "water_candidate_samples":int(np.isin(bins,[1,3,4]).sum()),
                    "unobserved_water_samples":int((bins==255).sum()),
                    "steepest_dsm_window_center_utm":list(geom.interpolate(s[int(longgrade.argmax())+1]).coords[0]) if len(longgrade) else None}
            feat={k:v for k,v in row.items() if k!="points"}
            feat.update(geometry=mapping(geom),core_anchors=[p for p in row["points"] if isinstance(p,dict)])
            if mode=="lines":
                feat["method"]=choice
                feat["render_status"]="review_required" if (row["id"] in REVIEW_ONLY or choice=="terrain_constraint_unresolved" or
                  (row["kind"] in ("rail","road") and max_grade is not None and max_grade > (5 if row["kind"]=="rail" else 12)) or
                  (row["kind"]=="road" and np.isin(bins,[1,3,4]).sum()>0)) else "aerial_candidate"
            features.append(feat)
    assert len({f["id"] for f in features})==len(features)
    assert ends["kcr-sungang-buji"][1]==ends["kcr-buji-pinghu"][0]
    assert ends["kcr-buji-pinghu"][1]==ends["kcr-north-continuation"][0]
    assert ends["guangshen-nantou-town"][0]==ends["guangshen-northwest"][0]
    crossings=[]
    for x,y in combinations([f for f in features if f["geometry"]["type"]=="LineString"],2):
        g=shape(x["geometry"]).intersection(shape(y["geometry"]))
        if not g.is_empty and not (x["corridor"]==y["corridor"] and g.geom_type=="Point" and
                                  tuple(g.coords[0]) in ends[x["id"]] and tuple(g.coords[0]) in ends[y["id"]]):
            crossings.append({"ids":[x["id"],y["id"]],"geometry":mapping(g),"status":"unresolved"})
    coverage={k:{"kh9_alpha_share":round(float(kh9[t:b,l:r].mean()),3),
                 "oct79_mss_data_share":round(float((water[t:b,l:r]!=255).mean()),3)}
              for k,(l,t,r,b) in SECTORS.items()}
    source_dsm=sorted((a.research/"data/raw/sources/copernicus_dem_glo30").glob("*.tif"))
    assert source_dsm,"Native Copernicus DSM is required for the rail review"
    native={f["id"]:screen_native_rail(shape(f["geometry"]),f["searchHalfWidthM"],source_dsm,meta["crs"],west,north,hydro)
            for f in features if f["id"] in REVIEW_ONLY}
    out=dict(format="sz-municipal-map-v1",crs=meta["crs"],units="m",date=picks["date"],bounds=list(extent.bounds),
             status="lead",sources=picks["sources"],features=features,open=picks["open"],
              water_comparator={"date":"1979-10-19","file":shore_path.name,"classes":LEGEND,"offshore_seed_cells":seeds,
                                "reservoirs":reservoirs},
             checks={"counts":dict(Counter(f["kind"] for f in features)),"coverage":coverage,
                     "kh9_alpha_share_whole_grid":round(float(kh9.mean()),3),
                     "limitations":"Raster alpha is not usable-image coverage: cloud, film markings, relief displacement and weak control remain.",
                     "water_cells":{int(k):int(v) for k,v in zip(*np.unique(hydro,return_counts=True))},
                      "long_profiles":terrain_flags,"native_dsm_rail_review":native,"unresolved_intersections":crossings},
              inputs={p.name:sha256(p.read_bytes()).hexdigest() for p in (PICKS,CORE,grid/"grid.bin",grid/"water1979.bin",grid/"kh9_1980.png",grid/"kh9_1980.json",*source_dsm)})
    write_json(a.out/"municipal-gis.json",out)
    review_plate(a.out/"municipal-review.png",extent,elev,hydro,features,core,reservoirs)
    print(json.dumps(out["checks"],indent=2))


if __name__=="__main__":
    main()
