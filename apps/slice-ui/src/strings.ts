/**
 * The UI's own strings (phase1-slice.md §11.1), each with an English and a Simplified Chinese entry; the UI shows one
 * of them (src/lang.ts). They name mechanics only: no dates, figures, names or claims. Content names (events,
 * investors, projects, teams, areas, leaders, zones) come from content, never from here.
 */
import type { LocalizedString } from '@sz/sim-core';

export type L = LocalizedString;
const l = (zh: string, en: string): L => ({ zh, en });

/** Titles of the cards that systems raise (events' cards are named in content). */
export const SYSTEM_CARDS: Readonly<Record<string, L>> = {
  'leader.shortcut': l('领导的捷径', "The leader's shortcut"),
  'fiscal.project_loan': l('银行项目贷款', 'The project loan'),
  'fiscal.deficit': l('财政赤字', 'The deficit'),
  'review.annual': l('年度考核', 'The annual review'),
  'climate.failure': l('被撤职', 'Removed from office'),
};

/** Options shared by several cards. Event options are named in content first. */
export const OPTIONS: Readonly<Record<string, L>> = {
  noted: l('知道了', 'Noted'),
  decline: l('拒绝', 'Decline'),
  take: l('接受贷款', 'Take the loan'),
  borrow_short: l('短期借款', 'Borrow short-term'),
  use_land_money: l('动用土地收入', 'Use land money'),
  austerity: l('削减开支', 'Cut spending'),
};
export const ACCEPT_ZONE = l('接受，落户', 'Accept, sited in');
export const ACCEPT_PREMISES = l('接受，用现有厂房：', 'Accept, in existing premises in');
export const ZONE = l('区块', 'Zone');
export const NEW_ZONE = l('新区块', 'New zone');
export const LOAN_KIND: Readonly<Record<string, L>> = { project: l('项目贷款', 'Project loan'), short: l('短期借款', 'Short-term loan') };
export const AREA = l('片区', 'Area');

export const LAND_USE: Readonly<Record<string, L>> = {
  industrial: l('工业', 'Industrial'), residential: l('居住', 'Residential'), commercial: l('商业', 'Commercial'),
  reserve: l('储备', 'Reserve'),
};
export const ENFORCEMENT: Readonly<Record<string, L>> = { low: l('低', 'Low'), medium: l('中', 'Medium'), high: l('高', 'High') };
/** R10d (phase1-slice §5.13): the import quota setting. */
export const IMPORT_QUOTA: Readonly<Record<string, L>> = {
  strict: l('从严审批', 'Strict approval'), balanced: l('按常规审批', 'Standard approval'), open: l('从宽审批', 'Lenient approval'),
};
export const PERMIT: Readonly<Record<string, L>> = { loose: l('宽松', 'Loose'), standard: l('一般', 'Standard'), strict: l('严格', 'Strict') };
export const PRIORITY: Readonly<Record<string, L>> = { high: l('优先', 'High'), normal: l('正常', 'Normal'), low: l('靠后', 'Low') };
export const POP_KIND: Readonly<Record<string, L>> = {
  villager: l('村民', 'Villagers'), urban_resident: l('城镇居民', 'Town residents'),
  migrant_factory: l('外来工人', 'Factory migrants'), migrant_construction: l('建筑工人', 'Construction migrants'),
  hk_manager: l('港方管理人员', 'Hong Kong managers'),
};
export const SECTOR: Readonly<Record<string, L>> = {
  state: l('国营单位', 'State units'), farming_fishing: l('农渔业', 'Farming and fishing'), factory: l('工厂', 'Factories'),
  construction: l('建筑', 'Construction'), services: l('服务业', 'Services'),
};
export const OBLIGATION: Readonly<Record<string, L>> = {
  baseline: l('基本支出', 'Baseline'), debt_service: l('还本付息', 'Debt service'), payroll: l('工资', 'Payroll'),
  service: l('公共服务', 'Services'), maintenance: l('维护', 'Maintenance'), compensation: l('征地补偿', 'Land compensation'), transfer: l('转移支付', 'Transfers'),
  arrears: l('拖欠', 'Arrears'),
};
export const INDICATOR: Readonly<Record<string, L>> = {
  exports_usd: l('出口（美元）', 'Exports (USD)'), forex_earned_usd: l('留成外汇（美元）', 'Forex earned (USD)'),
  foreign_firm_jobs: l('外资企业岗位', 'Jobs at foreign firms'), projects_completed: l('完工项目', 'Projects completed'),
  order_check: l('违建比例（可见）', 'Illegal floor share (visible)'),
};
export const ROLE: Readonly<Record<string, L>> = { secretary: l('书记', 'Secretary'), mayor: l('市长', 'Mayor') };
export const TRAIT: Readonly<Record<string, L>> = { deal_maker: l('善于谈判', 'Deal-maker'), cautious: l('谨慎', 'Cautious') };
export const RISK: Readonly<Record<'low' | 'medium' | 'high', L>> = { low: l('低', 'low'), medium: l('中', 'medium'), high: l('高', 'high') };
export const STAGE: Readonly<Record<string, L>> = {
  committed: l('已立项', 'Committed'), building: l('施工中', 'Building'), stalled: l('停工', 'Stalled'),
  done: l('完工', 'Done'), cancelled: l('取消', 'Cancelled'),
};
export const WAITING: Readonly<Record<string, L>> = {
  capacity: l('等施工力量', 'waiting for crews'), finance: l('等资金', 'waiting for money'),
  mobilization: l('等进场', 'mobilising'), frozen: l('冻结', 'frozen'),
  paused: l('已暂停', 'paused'), access: l('道路未通', 'no road access'),
};

// ---- R5: the planning map (§11.2) ----

/** The constraint ladder's rungs, as the inspector's "Held back by" names them. */
export const RUNG: Readonly<Record<string, L>> = {
  unbuildable: l('不可建设用地', 'Unbuildable land'), unzoned: l('未规划', 'Not zoned'),
  not_queued: l('未安排三通一平', 'No site formation ordered'), waiting: l('工程在等待', 'Works waiting'),
  no_frontage: l('不临路：三通一平无法开工', 'No road frontage: site formation cannot start'),
  servicing: l('三通一平进行中', 'Site formation under way'),
  utility: l('企业用电不足', 'Not enough power for its firms'), low_demand: l('需求不足', 'Low demand'),
  building: l('正在建设', 'Building under way'), active: l('无：已在运转', 'Nothing: active'),
};
export const ORDER_KIND: Readonly<Record<string, L>> = {
  service: l('三通一平工程', 'Site formation order'), road: l('道路', 'Road'), structure: l('设施', 'Structure'),
};
export const ORDER_STAGE: Readonly<Record<string, L>> = {
  queued: l('排队中', 'Queued'), working: l('施工中', 'Working'), done: l('完工', 'Done'), cancelled: l('已取消', 'Cancelled'),
};
export const STRUCTURE: Readonly<Record<string, L>> = {
  water_source: l('水源', 'Water source'), power_source: l('电源', 'Power source'), facility: l('公共设施', 'Facility'),
  power_substation: l('变电站', 'Substation'), power_station: l('电厂', 'Power station'),
};
export const FACILITY: Readonly<Record<string, L>> = { school: l('学校', 'School') };
/** R8d (§5.12): the road tiers. */
/** R8b (§5.3): zone intensity tiers. */
export const INTENSITY: Readonly<Record<string, L>> = { low: l('低', 'Low'), standard: l('标准', 'Standard'), high: l('高', 'High') };
/** R11.1: one brief line for the selected tier; the long form is in the hover title and the details switch. */
export const INTENSITY_BRIEF: Readonly<Record<string, L>> = {
  low: l('低：每平方米楼面最省电，占地最多。', 'Low: least power per m², most land.'),
  standard: l('标准：造价、土地和用电都居中。', 'Standard: balanced cost, land and power.'),
  high: l('高：每平方米楼面最省钱，但需要大道。', 'High: least money per m², but needs an avenue.'),
};
export const INTENSITY_DETAIL: Readonly<Record<string, L>> = {
  low: l('低强度：每平方米楼面最省电，但占地最多。', 'Low: the least power per m² of floor, but the most land.'),
  standard: l('标准强度：造价、用地和用电都居中。', 'Standard: balanced cost, land and power.'),
  high: l('高强度：每平方米楼面最省钱，但需要大道，用电也更多。', 'High: the least money per m² of floor, but it needs an avenue and more power.'),
};
export const ROAD_CLASS: Readonly<Record<string, L>> = { track: l('土路', 'Track'), street: l('街道', 'Street'), avenue: l('大道', 'Avenue') };
/** R11.1: the selected works pace, one brief line. */
export const PACE_BRIEF: Readonly<Record<string, L>> = {
  normal: l('正常：按标准施工力量和单价。', 'Normal: standard crew and cost per unit.'),
  push: l('加快：进度更快，单位造价更高。', 'Push: faster, more expensive per unit.'),
  all_out: l('全力：最快，单位造价最高。', 'All-out: fastest, most expensive per unit.'),
};
/** A cell's works stage, and the stage of a zoned cell with no works. */
export const WORK_STAGE: Readonly<Record<string, L>> = {
  zoned: l('已规划，未安排工程', 'Zoned, no works'), planned: l('已安排', 'Planned'),
  servicing: l('平整中', 'Forming'), serviced: l('已平整', 'Formed'),
};
export const TOOL: Readonly<Record<string, L>> = {
  select: l('查看', 'Inspect'), road: l('道路', 'Roads'), zone: l('规划', 'Zones'), service: l('平整土地', 'Form site'),
  erase: l('撤销', 'Erase / cancel'), power: l('变电站', 'Substation'), station: l('电厂', 'Power station'), facility: l('公共设施', 'Facilities'),
};
/** What each tool does, shown in its flyout. */
export const TOOL_HINT: Readonly<Record<string, L>> = {
  select: l('点击地块查看', 'Click a cell to inspect it'),
  road: l('从现有道路拖出一条路（先横后竖）', 'Drag a road out from an existing one (across, then down)'),
  zone: l('拖出一个矩形：划区并安排三通一平', 'Drag a rectangle: zone it and order its site formation'),
  service: l('点击区块安排三通一平；拖动只平整拖过的格', 'Click a zone to order its site formation; drag to form only the cells you drag over'),
  erase: l('点击撤销未开工的工程或本回合的指令', "Click to cancel unstarted work or this turn's orders"),
  power: l('点击临路的地块放置变电站：把全市电力沿道路送到附近的区块', 'Click a cell beside a road to place a substation: it carries the city pool along the roads to nearby zones'),
  station: l('点击临路的地块建电厂：建成后为全市增加电力', 'Click a cell beside a road to build a power station: once finished it adds to the city pool'),
  facility: l('点击临路的地块放置公共设施', 'Click a cell beside a road to place a facility'),
};
/** R7 (§11.2): the visible caption above each chip stat. */
export const CHIP_STAT: Readonly<Record<string, L>> = {
  crews: l('施工力量 · 已承诺', 'Crews · committed'), works: l('进行中／停滞', 'Running / stalled'),
  forProjects: l('项目资金', 'For projects'), commitments: l('已承诺 · 之后', 'Committed · after'),
  residents: l('常住人口', 'Residents'), turnedAway: l('找不到床位', 'Turned away'),
  gdp: l('本季度GDP', 'GDP, quarter'), vacancies: l('空缺岗位', 'Vacancies'),
  scrutiny: l('上级关注', 'Scrutiny'), targets: l('考核达标', 'Targets met'),
};
export const CHIP: Readonly<Record<string, L>> = {
  building: l('建设', 'Building'), budget: l('预算', 'Budget'), population: l('人口', 'Population'),
  economy: l('经济', 'Economy'), politics: l('政治', 'Politics'),
};
/** The I/C/R cue's letters: one character each. */
export const CUE: Readonly<Record<string, L>> = { i: l('工', 'I'), c: l('商', 'C'), r: l('住', 'R') };
export const CUE_INPUT: Readonly<Record<string, L>> = {
  industrialDemand: l('工业用地需求', 'Industrial floor demand'), headroom: l('新企业的水电余量', 'Utility headroom for a new firm'),
  spending: l('消费带动的正式服务岗位', 'Formal service jobs from spending'), shopPosts: l('有铺面的正式岗位', 'Formal posts with shop floor'),
  crowding: l('出租屋拥挤度', 'Rental crowding'), turnedAway: l('上月找不到床位的人', 'Turned away last month'),
};
/** R8a (phase1-slice §5.5): the land-cover classes; the four formable ones say so. */
export const LAND_COVER: Readonly<Record<string, L>> = {
  water: l('水面（不可平整）', 'Water (not formable)'), tidal_flat: l('滩涂（不可平整）', 'Tidal flat (not formable)'),
  pond: l('鱼塘', 'Fishponds'), hill: l('山地（不可平整）', 'Hill (not formable)'),
  village: l('村庄（不可平整）', 'Village (not formable)'), town: l('镇区边缘', 'Town fringe'),
  upland: l('坡地', 'Upland'), lowland_farm: l('平地农田', 'Lowland farmland'),
};
export const OVERLAYS: Readonly<Record<string, L>> = {
  areas: l('片区', 'Areas'), land_use: l('用地规划', 'Land use'), illegal: l('违建比例', 'Illegal floor share'),
  occupancy: l('出租屋拥挤度', 'Rental crowding'), service_gap: l('公共服务缺口', 'Service gap'),
  buildable: l('可建设用地与已平整土地', 'Buildable and formed land'), land_cover: l('1979年土地覆盖', 'Land cover, 1979'),
  stages: l('工程阶段', 'Works stages'), network: l('路网与临路深度', 'Road network and frontage'),
  utilities: l('水电供应', 'Utility supply'), held: l('受制约因素', 'Held back by'), demand: l('需求', 'Demand'),
};

export const T = {
  title: l('深圳 · 第一阶段试玩', 'Shenzhen · the Phase 1 slice'),
  turn: l('回合', 'Turn'),
  quarter: l('季度', 'Quarter'),
  endTurn: l('结束回合', 'End turn'),
  continue: l('继续', 'Continue'),
  paused: l('季度中途：先回答这张卡', 'Mid-quarter: answer this card first'),
  mustAnswer: l('必须回答', 'Must be answered'),
  optional: l('可稍后回答', 'Can wait'),
  moreOffers: l('更多要约', 'More offers'), firstWaveMix: l('首批投资构成', 'First-wave mix'),
  shortcutFrom: l('来自要约', 'Shortcut for'),
  expires: l('到期', 'Expires'),
  noCards: l('没有待办的卡片', 'No cards waiting'),
  cancelPending: l('取消待生效', 'Cancel pending'),
  highPriority: l('高优先级', 'High priority'),
  compensation: l('征地补偿', 'Land compensation'),
  showGap: l('显示缺口', 'Show gap'),
  crewCap: l('每个工单的施工队默认上限', 'Default crews per order'),
  crews: l('施工队', 'Crews'),
  overspend: l('超出可用资金；本季度将动用下期补助或储备', 'Over available; the quarter draws on the next grant or reserve'),
  briefing: l('简报', 'Briefing'),
  cards: l('卡片', 'Cards'),
  queue: l('本回合的指令', "This turn's orders"),
  emptyQueue: l('还没有指令', 'No orders yet'),
  remove: l('移除', 'Remove'),
  error: l('无法执行', 'Could not apply'),
  residents: l('常住人口', 'Residents'),
  presentNonlocal: l('外来人口（在地）', 'Non-locals present'),
  firmJobs: l('企业岗位', 'Firm jobs posted'), offerJobs: l('提供岗位', 'Jobs offered'),
  gdpQuarter: l('本季度GDP（元）', "The quarter's GDP (yuan)"),
  gdpYear: l('全年GDP', "A year's GDP"),
  moneyForProjects: l('可用于项目的资金（元）', 'Money for projects (yuan)'),
  scrutiny: l('上级关注度', 'Scrutiny'),
  ledger: l('财政', 'Ledger'), area: l('片区', 'Area'), leaders: l('领导', 'Leaders'), review: l('考核', 'Review'),
  build: l('建设', 'Build'), policy: l('政策', 'Policy'), zones: l('规划', 'Zones'),
  recurring: l('经常性收支（每月）', 'Recurring (per month)'),
  revenue: l('收入', 'Revenue'), due: l('应付', 'Due'), available: l('结余', 'Balance'), perYear: l('全年', 'Per year'),
  projectsView: l('项目资金', 'Money for projects'), funds: l('资金', 'Funds'), unspent: l('已承诺未支出', 'Committed, unspent'),
  forex: l('外汇额度（美元）', 'Forex quota (USD)'), borrowing: l('可借额度', 'Borrowing capacity'),
  obligations: l('按类别的支出（每月）', 'Obligations by kind (per month)'),
  loans: l('贷款', 'Loans'), outstanding: l('未还本金', 'Outstanding'), noLoans: l('没有贷款', 'No loans'),
  balances: l('账户余额', 'Balances'),
  pops: l('人口', 'People'), size: l('常住', 'Usual residents'), present: l('在地', 'Present'),
  beds: l('床位与住户', 'Beds and occupants'), localBeds: l('自住', 'Own homes'), rentalBeds: l('出租', 'Rental'),
  crowding: l('拥挤度', 'Crowding'), rent: l('租金', 'Rent'),
  jobs: l('岗位（已填/总数）', 'Jobs (filled / posted)'), utilities: l('富余容量', 'Spare capacity'),
  power: l('电力（千瓦）', 'Power (kW)'), water: l('供水（吨/日）', 'Water (m³/day)'),
  powerPool: l('全市电力（千瓦）', 'City power pool (kW)'), powerLocal: l('本地电源', 'Local plant'),
  powerBought: l('外购（已到）', 'Bought (arrived)'), powerOnOrder: l('外购（在途）', 'Bought (on order)'),
  powerStations: l('电厂', 'Power stations'), powerSited: l('企业用电', 'Firms\' need'), powerSpare: l('富余', 'Spare'),
  powerUnmet: l('供电不足的片区', 'Areas short of power'), buyPower: l('外购电力', 'Buy power'),
  roadTier: l('道路等级', 'Road tier'),
  roadTierHint: l('等级越高，造价越高，运力越大；在已有道路上拖动可升级', 'A higher tier costs more and carries more freight; drag along an existing road to upgrade it'),
  freight: l('货运（吨/月）', 'Freight (t/month)'), freightUnmet: l('上月未运出', 'Not moved last month'),
  freightCapacity: l('容量 进/出', 'Capacity in / out'), freightRoute: l('片区至口岸的最弱路段', 'Weakest link, area to gateway'),
  freightHint: l('口岸容量为设计设定，非历史数据', 'Gateway capacities are design settings, not historical figures'),
  buyPowerHint: l('全市购电：到货前有等待期，到货后每月付费；线路有上限', 'A city purchase: it arrives after a wait, then is paid monthly; the line has a ceiling'),
  facilities: l('公共设施', 'Facilities'), schoolPlaces: l('学位', 'School places'), clinicVisits: l('门诊量', 'Clinic visits'),
  policePosts: l('派出所', 'Police posts'), illegalShare: l('违建比例', 'Illegal floor share'), roadKm: l('道路（公里）', 'Roads (km)'),
  firms: l('企业', 'Firms'), pickArea: l('点击地图上的片区', 'Click an area on the map'),
  rapport: l('默契', 'Rapport'), standing: l('上级评价', 'Standing'), disciplineRisk: l('纪律风险', 'Discipline risk'),
  shortcuts: l('记录在案的捷径', 'Shortcuts on record'), falls: l('撤换', 'Replacements'),
  thisYear: l('今年的考核指标', "This year's review"), projected: l('按现在算的得分', 'Score if held now'),
  target: l('目标', 'Target'), floor: l('底线', 'Floor'), value: l('现值', 'Now'), held: l('已进行的考核', 'Reviews held'),
  pass: l('通过', 'pass'), fail: l('未通过', 'fail'), vetoed: l('一票否决', 'vetoed'), noReviewLeft: l('没有更多考核', 'No review left'),
  enforcement: l('违建执法力度', 'Enforcement against illegal floors'), permits: l('暂住证政策', 'Temporary permits'),
  importQuota: l('进口审批松紧', 'Import approval'), forexBurned: l('外汇：进口花去 · 留成所得 · 余额', 'Forex: spent on imports · earned · left'),
  drawZone: l('画一个区块：选用途，在地图上拖动', 'Draw a zone: pick a use, then drag on the map'),
  drawOff: l('不画', 'Not drawing'),
  template: l('历史规划', 'The historical plan'), apply: l('采用', 'Apply'),
  removeZone: l('撤销区块', 'Remove zone'), cells: l('格', 'cells'),
  commit: l('立项', 'Commit'), target_: l('地点', 'Where'), priority: l('优先级', 'Priority'),
  projectsList: l('项目', 'Projects'), cancel: l('取消', 'Cancel'),
  teams: l('施工队伍', 'Construction teams'), contract: l('签约（统筹使用）', 'Contract (pool)'), live: l('在场', 'on site'),
  verdict: l('结局', 'The verdict'), growth: l('增长（相对第一年）', 'Growth (over the first year)'),
  fiscalTest: l('财政检验（不计补助）', 'The fiscal test (without the grant)'), reserve: l('储备', 'Reserve'),
  bankShare: l('基建贷款占比（1982–83）', 'Bank share of construction (1982–83)'),
  debtToRevenue: l('债务 ÷ 年收入', 'Debt ÷ yearly revenue'), wage: l('工厂月工资', 'Factory monthly wage'),
  sheds: l('工棚床位', 'Worksite shed beds'), briefingLoan: l('1980年简报贷款', 'The 1980 briefing loan'),
  debtService: l('未来12个月还本付息', 'Debt service, next 12 months'),
  debt: l('债务', 'Debt'), arrears: l('拖欠', 'Arrears'), ended: l('试玩结束', 'The slice is over'),
  failure: l('因上级关注度过高被撤职', 'Removed: scrutiny stayed too high'),
  report: l('报告', 'Report'), preview: l('预估', 'Preview'), opensIn: l('开工还需（月）', 'Months to open'),
  bedsNeeded: l('需要床位', 'Beds needed'), powerNeed: l('用电', 'Power'), powerFree: l('富余电力', 'Spare power'),
  powerEnough: l('电力够', 'Power enough'), powerShort: l('电力不足', 'Power short'),
  bedsEnough: l('床位够', 'Beds enough'), bedsShort: l('床位不足', 'Beds short'),
  inPremises: l('现有厂房', 'in premises'), inNewFactory: l('新建厂房', 'in a new factory'),
  premisesFree: l('现有厂房空位', 'Premises jobs free'),
  perYearOutput: l('满产年产值', 'Output a year at full ramp'), cash: l('本季度现金', 'Cash this quarter'),
  retained: l('每年留成税收', 'Retained tax a year'), newObligations: l('每年新增支出', 'New obligations a year'),
  shortfall: l('缺口', 'Shortfall'), capacity: l('可借', 'Can borrow'), principal: l('本金', 'Principal'),
  rate: l('月利率', 'Monthly rate'), grace: l('宽限期（月）', 'Grace (months)'), term: l('期限（月）', 'Term (months)'),
  bar: l('准备程度', 'Readiness'), readyRoads: l('道路', 'Roads'), readyLand: l('已平整土地', 'Formed land'),
  readyWaterPower: l('水电', 'Water and power'),
  mandate: l('任务', 'The mandate'), mandateMet: l('已完成', 'met'), mandateOpen: l('未完成', 'not yet met'),
  noMandate: l('特区成立后确定', 'Set when the zone is established'),
  answerFirst: l('请先回答', 'Answer first'), turnStartOnly: l('指令只能在回合开始时下达', "Orders are given at a turn's start"),
  noSuchCard: l('没有这张卡片', 'No such card'), noSuchOption: l('没有这个选项', 'No such option'), forecast: l('首批投资者预计', 'First wave forecast'), score: l('得分', 'Score'),
  grantFactor: l('补助系数', 'Grant factor'), warning: l('补助将削减', 'The grant will be cut'),
  seed: l('随机种子', 'Seed'), restart: l('重新开始', 'Start again'),
  month: l('月', 'month'), none: l('无', 'none'),
  temporaryAlignment: l('临时走线', 'Temporary alignment'),
  temporaryAlignments: l('临时走线', 'Temporary alignments'),
  temporaryAlignmentHint: l('临时走线只用于显示和划区后的临路判断；它们不是已建成的市政道路。',
    'The temporary alignments are display-only: a zone beside one gets frontage, but they are not built municipal roads.'),
  roadAccess: l('道路可达', 'Road access'),
  noRoadAccess: l('无道路连接', 'No road access'), language: l('语言', 'Language'),
  // R5 (§11.2)
  endQuarter: l('结束季度', 'End quarter'), pendingDecisions: l('待决事项', 'Pending decisions'),
  toAnswer: l('必须回答', 'to answer'), overlay: l('图层', 'Overlay'), close: l('关闭', 'Close'),
  planOnly: l('只规划，不安排三通一平', 'Plan only (no site formation)'), showGuide: l('显示历史规划', 'Show the historical plan'),
  zoneGuide: l('按历史规划划区', 'Zone the historical plan'), facilityType: l('设施类型', 'Facility type'),
  cell: l('地块', 'Cell'), use: l('用途', 'Use'), stage: l('阶段', 'Stage'), progress: l('工程进度', 'Work progress'),
  supplied: l('水电', 'Power and water'), noDemand: l('无需求', 'no demand'),
  areaShare: l('片区企业的水电保障', "The area's firms' utility share"),
  zoneFloor: l('区块楼面（区块存量）', 'Floor in the zone (zone stock)'),
  villageFloor: l('村屋楼面（片区存量）', 'Village floor (area stock)'),
  areaJobsBeds: l('岗位与床位（片区存量）', 'Jobs and beds (area stock)'),
  perCell: l('本格的事实', 'This cell'), heldBackBy: l('受制于', 'Held back by'),
  notZoned: l('不在区块内', 'Not in a zone'), depth: l('临路深度', 'Frontage depth'),
  workFinished: l('完工情况', 'Where work finished'), heldBackArea: l('最受制约的片区', 'The area most held back'),
  nothingHeld: l('没有受制约的片区', 'Nothing is held back'), noWorkFinished: l('上季度没有完工的工程', 'No work finished last quarter'),
  toMap: l('回到地图', 'To the map'), servicedCells: l('格土地平整完成', 'cells formed'), roadCells: l('格道路', 'road cells'),
  sourcesPlaced: l('个水电源', 'sources'), facilitiesPlaced: l('个公共设施', 'facilities'), ordersDone: l('项工程完工', 'works done'),
  firmsOpened: l('家企业开业', 'firms opened'), cellsHeld: l('格', 'cells'),
  cost: l('费用', 'Cost'), crewPerMonth: l('每月施工', 'Crew a month'), months: l('满负荷月数', 'Months at full pace'),
  bridges: l('座桥', 'bridges'), units: l('工作量', 'Work units'), landCover: l('土地覆盖', 'Land cover'), refused: l('不能这样建', 'Cannot build this'),
  nothingToService: l('没有可以平整的格', 'No cells to form'),
  startedWork: l('已开工的工程不能撤销', 'Started work cannot be erased'),
  builtRoad: l('已建成的道路不能拆除', 'A built road cannot be removed'),
  startRoad: l('原有道路不能拆除', 'A start road cannot be removed'),
  builtStructure: l('已建成的设施不能拆除', 'A built structure cannot be removed'),
  zoneHasWorks: l('区块里有工程：先撤销工程', 'The zone has works: cancel them first'),
  existingStock: l('原有村镇是现有存量，不是规划', 'An existing settlement is stock, not zoning'),
  nothingToErase: l('这里没有可撤销的东西', 'Nothing to erase here'),
  noAttachRoad: l('旁边没有道路：建成后无法供应', 'No road beside it: it will supply nothing'),
  worksQueue: l('工程队列', 'Works queue'), remaining: l('剩余费用', 'Remaining cost'),
  pause: l('暂停', 'Pause'), resume: l('恢复', 'Resume'),
  crewsInUse: l('在用施工力量／总数', 'Crews in use / total'), worksRunning: l('进行中／停滞的工程', 'Works running / stalled'),
  netQuarter: l('每季度净收支', 'Net per quarter'), turnedAway: l('找不到床位的人', 'Turned away'),
  vacancies: l('可到达的空缺岗位', 'Accessible vacancies'), targetsMet: l('达标的考核指标', 'Review targets met'),
  demandCue: l('需求', 'Demand'), low: l('偏低', 'low'), exports: l('出口（美元，本季度）', 'Exports (USD, this quarter)'),
  newZone: l('新区块', 'new zone'), queued: l('本回合', 'this turn'), stocks: l('区块与片区的存量', 'Zone and area stock'),
  // R7 (§13 vocabulary): 三通一平 is site formation; the hint says the plot-edge connections are already included
  siteFormation: l('三通一平', 'Site formation'),
  formationHint: l('清场、平整、内部道路，以及地块边上的接水接电。这些已经包含在内，不必另外建设。',
    'Clearing, levelling, internal lanes, and the water and power connection at the plot edge. Already included — you do not build these separately.'),
  // R8b (§5.3): the zone intensity
  intensity: l('开发强度', 'Intensity'),
  intensityHint: l('低强度：每平方米楼面最省电，但占地最多。高强度：每平方米最省钱，但需要大道。',
    'Low: the least power per m² of floor, but the most land. High: the least money per m², and it needs an avenue.'),
  highLocked: l('高强度尚未开放，需要特区政策。', 'High intensity is not available yet: it comes with the zone policy.'),
  // R7 (§11.2): the money committed and the funds left after it
  committed: l('已承诺未支出', 'Committed'), afterCommitments: l('承诺之后的项目资金', 'Funds after commitments'),
  commitmentsHint: l('已承诺未支出：在建工程、项目和本回合排队的指令，加上本季度到期的一次性支出 · 扣除之后可用于项目的资金',
    "Committed: live orders and projects, this turn's queued orders, and one-off costs due this quarter · money for projects after them"),
  crewsCommitted: l('在用施工力量／总数 · 已承诺未支出', 'Crews in use / total · committed'),
  queuedThisTurn: l('本回合排队的指令', "This turn's queued orders"), oneOffDue: l('本季度到期的一次性支出', 'One-off costs due this quarter'),
  // R9 (§11.2): locked tools, the works pace, the news and the live modifiers
  opensWith: l('随此开放：', 'Opens with '), locked: l('尚未开放', 'Locked'), unlockLater: l('稍后解锁', 'Unlocks later'),
  pace: l('施工节奏', 'Pace'),
  paceHint: l('加快：同样的工程，每月施工力量做得更多，但每单位花钱更多。只影响尚未完成的部分。',
    "Faster: the same work, more of it done by each month's crew, at more money a unit. Only unworked units are re-priced."),
  showDetails: l('显示详细说明', 'Show details'),
  formationBrief: l('清场、平整和地块边的接水接电已包含在内。', 'Clearing, levelling and the plot-edge connections are included.'),
  roadTierBrief: l('等级越高，造价越高，运力越大。', 'Higher tiers cost more and carry more freight.'),
  monthsSaved: l('节省月数', 'Months saved'), extraYuan: l('额外费用', 'Extra cost'),
  news: l('消息', 'News'), noNews: l('上季度没有新消息。', 'No news since the last quarter.'),
  liveModifiers: l('仍在起作用的影响', 'Effects still in force'), quartersLeft: l('剩余季度', 'quarters left'),
  noModifiers: l('没有。', 'None.'),
  // R11.1 (playtest revision): map framing, the map key, the readiness target and the guided opening
  mapKey: l('图例', 'Map key'), playableArea: l('可开发片区', 'Playable area'),
  cardOnlyArea: l('仅卡片片区', 'Card-only area'), cardsOnly: l('仅卡片', 'cards only'),
  cityBorder: l('市界', 'City limit'),
  farmlandBuildable: l('农田（可平整，有补偿）', 'Lowland farmland (buildable, compensated)'),
  notFormable: l('不可平整（划区时显示红色）', 'Not formable (red while zoning)'),
  zoneKey: l('规划用地', 'Zoned land'),
  historicalPlan: l('1984年规划', '1984 proposal'),
  historicalProposal: l('建议用地', 'Proposed zone'),
  historicalWorks: l('在建用地', 'Works zone'),
  startRoutes: l('临时道路／铁路', 'Temporary road / rail'),
  areasLegend: l('片区', 'Areas'), focusArea: l('定位', 'Focus'),
  fitPlayable: l('可开发片区', 'Fit playable'), fitAll: l('全境', 'Whole city'),
  zoomIn: l('放大', 'Zoom in'), zoomOut: l('缩小', 'Zoom out'),
  mapGestureHint: l('左键拖动建设 · 右键拖动平移 · 滚轮缩放', 'Drag to build · right-drag to pan · scroll to zoom'),
  outsidePlayable: l('不在七个可开发片区之内', 'Outside the seven playable areas'),
  frontageIfZoned: l('划区后可临路', 'Frontage if zoned'), noFrontageNear: l('附近没有临路条件', 'No road frontage nearby'),
  raised: l('提出', 'Raised'), allAnswered: l('已全部答复', 'all answered'), stacked: l('本季度共', 'This quarter:'),
  readinessTarget: l('序章目标', 'Prologue target'), readinessForecast: l('首批投资卡预计', 'First-wave cards forecast'),
  readinessCards: l('张首批投资卡', 'first-wave cards'),
  weakestPart: l('最弱的一环', 'Weakest part'), startHere: l('先从这里开始', 'Start here'),
  points: l('个百分点', 'pts'), newFirms: l('家新企业接入，消耗了备用电力', 'new firms connected, drawing on spare power'),
  readinessExplainer: l('道路算新建的道路格；已平整土地算准备区里完成三通一平的格；水电算全市余量够不够再开一家标准企业。',
    'Roads counts newly built road cells; formed land counts serviced cells in the readiness areas; power asks whether the city pool can carry one more standard firm.'),
  guideReference: l('仅供参考；只显示，不下达指令', 'Reference only; showing it creates no orders'),
  verdictGrew: l('城市长大了，账面也撑住了这一轮建设。', 'The town grew, and the books carried the build.'),
  verdictStagnant: l('城市几乎没有长大；规划跑在了建设前面。', 'The town barely grew; the plan outran the building.'),
  verdictFiscalGood: l('不算补助，第一年也能自己撑住。', 'Without the grant, the city can carry its first year.'),
  verdictFiscalBad: l('不算补助，第一年就出现赤字；繁荣是靠借款撑起来的。', 'Without the grant, the first year ends in deficit; the boom was carried by borrowing.'),
  verdictReviewsGood: l('历次年度考核都过了。', 'Every annual review held.'),
  verdictReviewsMixed: l('至少有一次年度考核没有通过。', 'At least one annual review failed.'),
  tutorialTitle: l('上手引导', 'Getting started'), tutorialSpeaker: l('老梁', 'Old Liang'),
  tutorialRole: l('市革委会办公室', 'Committee office'),
  tutorialSkip: l('跳过引导', 'Skip guide'), tutorialNext: l('下一步', 'Next'),
  tutorialStart: l('开始', 'Start'), tutorialDone: l('开始建设', 'Start building'), tutorialUseBlock: l('直接采用这块地', 'Use this block'),
  tutorialWait: l('完成上面的操作后继续', 'Finish the step to continue'),
  tut0Title: l('先坐下', 'Sit down first'),
  tut0Body: l('小同志，来，先坐。我是老梁，在市革委会办公室管些杂事。县里的印封了，市里的印还没刻好，咱们先不立章程，先看地图。亮着的是可开发的地，别处先压暗；拖一拖，滚轮缩放。',
    'Sit down, comrade. I am Old Liang, from the committee office. The county seal is sealed up and the city seal is not cut yet, so we will not write rules first. Look at the map. The lit land is playable, the rest is covered; drag to look around, scroll to zoom.'),
  tut1Title: l('先摸清情况', 'Find out what we have'),
  tut1Body: l('省里让咱们先按“出口基地”做方案，“特区”这个名字先别对外讲。桌上那张摸底调查，你先签个“知道了”。',
    'The province wants us to plan on an export-base footing, and the name “special zone” stays off the record for now. Sign the survey on the desk with Noted.'),
  tut2Title: l('先选一块地', 'Pick one piece of land'),
  tut2Body: l('别贪大。先选一块能开工的地。左边点“规划”，工业和标准强度我都替你选好了。',
    'Do not be ambitious. Pick one piece of land we can actually start. Choose Zones on the left; I have set Industrial and Standard for you.'),
  tut3Title: l('就画这两格', 'Draw these two cells'),
  tut3Body: l('就画这两格，靠着那条临时走线，划区后就有临路条件。三通一平会自己排队；账上钱不多，别铺开。',
    'Draw these two cells beside the temporary alignment; they get frontage once zoned, and site formation queues itself. There is not much money, so do not spread out.'),
  tut4Title: l('看账，结束季度', 'Check the books, end the quarter'),
  tut4Body: l('右下角是这一季的指令。看一眼钱和施工队，然后结束季度。饭堂在楼下，饭票自理——这句你记住就行。',
    'The bottom right holds this quarter’s orders. Check the money and the crews, then end the quarter. The canteen is downstairs; meal tickets are your own — just remember that.'),
  tut5Title: l('准备程度', 'Readiness'),
  tut5Body: l('省里明年补助会少。准备程度到一半，第一批投资才像样。先补最弱的那一环；右下角那条小条，点开能看到细账。',
    'The province’s grant will shrink next year. Get readiness to half and the first wave looks decent. Fix the weakest part first; click the small strip at the bottom right for the details.'),
  tutScrutinyTitle: l('审查分是什么', 'What scrutiny means'),
  tutScrutinyBody: l('你头上现在有审查分了。省里看你怎么迈步：抢工、破例、人情，都会记上一笔。摸着石头过河，但别成了垫脚石。分高了会来检查，评审不过，人就得走。',
    'You have a scrutiny score now. It is the province’s file on how boldly you move: rushed work, exceptions and favours all leave a mark. Cross the river by touching the stones — but do not become the stepping stone. High scrutiny brings inspections, and a failed review can remove you.'),
  tutScrutinyDone: l('知道了', 'Understood'),
  sezResult: l('序章结果', 'Prologue result'),
  sezResultTitle: l('特区成立', 'The zone opens'),
  sezResultMet: l('特区成立时，序章目标达到了。', 'The prologue target was met when the zone opened.'),
  sezResultMissed: l('特区成立时，序章目标没有达到。', 'The prologue target was missed when the zone opened.'),
  sezResultDone: l('继续', 'Continue'),
} as const satisfies Record<string, L>;

/** R9 (§5.6): the works pace steps. */
export const PACE: Readonly<Record<string, L>> = { normal: l('正常', 'Normal'), push: l('加快', 'Push'), all_out: l('全力', 'All-out') };
/** R9 (§11.2): the news desks, as the briefing's headings. */
export const DESK: Readonly<Record<string, L>> = {
  beijing: l('来自北京', 'From Beijing'), province: l('来自省里', 'From the province'), city: l('来自本市', 'From the city'),
  hong_kong: l('来自香港', 'From Hong Kong'),
};

/** R9 (§5.8, §11.2): what each timed-modifier target scales, in words. */
export const MODIFIER_TARGET: Readonly<Record<string, L>> = {
  investor_rate: l('投资者到来', 'Investor arrivals'), scrutiny_gain: l('上级关注的增长', 'Scrutiny gains'),
  cohort_crew: l('民间施工每平方米所需人力', "Builders' crew per m²"), wage_drift: l('名义工资增长', 'Nominal wage growth'),
};

/** R7 (§11.2): an option's effect badges, derived from its on_answer effects in views.ts effectBadges. */
export const BADGE: Readonly<Record<string, L>> = {
  cost: l('花费', 'Cost'), scrutiny: l('上级关注', 'Scrutiny'), standing: l('上级评价', 'Standing'),
  commits: l('立项：', 'Commits '), permit: l('暂住证政策：', 'Permits: '), rush: l('在建项目全部改为优先', 'Every live project to high priority'),
  sweepHides: l('暂时遮住违建（月）', 'Hides illegal floors (months)'), sweepMood: l('外来人口情绪下降', "Migrants' mood falls"),
  team: l('施工队伍：', 'Adds a team: '), cofinance: l('不花城市的钱：', 'At no city cost: '),
  offer: l('一份投资意向', 'An investor offer'), offerTerms: l('附优惠条件', 'with a concession'),
  landFee: l('地价', 'Land fee'),
  loan: l('提供项目贷款', 'Offers the project loan'), sezOpen: l('特区开放', 'Opens the zone'),
  credit: l('动用基建贷款额度', 'Draws on the construction credit line'),
  regime: l('新的财政体制', 'A new fiscal regime'), unlockInvestment: l('开放投资', 'Unlocks investment'),
  unlock: l('开启新的一步', 'Unlocks the next step'), firstWave: l('第一批投资者', 'The first wave of investors'),
  orders: l('香港订单变化', 'Hong Kong orders change'), veto: l('今年考核一项不及格', "Fails one of this year's review items"),
  endRun: l('试玩结束', 'Ends the slice'), report: l('一份汇报', 'A report'), noEffect: l('没有影响', 'No effect'),
  // R9 (§11.2): a key that opens tool gates, a timed modifier and its shift
  opens: l('开放：', 'Opens '), months: l('个月', 'months'), monthsFor: l('，为期', ' for'),
  sooner: l('提前结束', 'end sooner by'), later: l('推迟结束', 'end later by'), effectsOf: l('的影响', "'s effects"),
};

/** Every table above, for the tests: each entry has an en and a zh. */
export const TABLES: Readonly<Record<string, Readonly<Record<string, L>>>> = {
  SYSTEM_CARDS, OPTIONS, LOAN_KIND, LAND_USE, LAND_COVER, ENFORCEMENT, IMPORT_QUOTA, PERMIT, PRIORITY, POP_KIND, SECTOR, OBLIGATION, INDICATOR,
  ROLE, TRAIT, RISK, STAGE, WAITING, OVERLAYS, T, RUNG, ORDER_KIND, ORDER_STAGE, STRUCTURE, FACILITY, WORK_STAGE, TOOL,
  TOOL_HINT, CHIP, CHIP_STAT, CUE, CUE_INPUT, BADGE, PACE, DESK, MODIFIER_TARGET,
  INTENSITY_BRIEF, INTENSITY_DETAIL, PACE_BRIEF, MISC: { ACCEPT_ZONE, ACCEPT_PREMISES, ZONE, NEW_ZONE, AREA },
};

/** Both names, Chinese first: how a place label reads in either language. */
export const bi = (s: L) => `${s.zh} ${s.en}`;
/**
 * A place label (an area, a 1979 site, a route, a precedent zone): it stays bilingual in both languages, so both its
 * fields read `zh en` (§11.1).
 */
export const place = (s: L): L => ({ zh: bi(s), en: bi(s) });
