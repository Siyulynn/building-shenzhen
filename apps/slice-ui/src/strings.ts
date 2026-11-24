/**
 * The UI's own strings (phase1-slice.md §11.1), English and Simplified Chinese side by side. They name mechanics only:
 * no dates, figures, names or claims. Content names (events, investors, projects, teams, areas, leaders, zones) come
 * from content, never from here.
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
  public: l('公共', 'Public'), reserve: l('储备', 'Reserve'),
};
export const ENFORCEMENT: Readonly<Record<string, L>> = { low: l('低', 'Low'), medium: l('中', 'Medium'), high: l('高', 'High') };
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
  service: l('公共服务', 'Services'), maintenance: l('维护', 'Maintenance'), transfer: l('转移支付', 'Transfers'),
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
};
export const OVERLAYS: Readonly<Record<string, L>> = {
  areas: l('片区', 'Areas'), land_use: l('用地规划', 'Land use'), illegal: l('违建比例', 'Illegal floor share'),
  occupancy: l('出租屋拥挤度', 'Rental crowding'), service_gap: l('公共服务缺口', 'Service gap'),
  buildable: l('可建设用地与三通一平', 'Buildable and serviced land'),
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
  expires: l('到期', 'Expires'),
  noCards: l('没有待办的卡片', 'No cards waiting'),
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
  facilities: l('公共设施', 'Facilities'), schoolPlaces: l('学位', 'School places'), clinicVisits: l('门诊量', 'Clinic visits'),
  policePosts: l('派出所', 'Police posts'), illegalShare: l('违建比例', 'Illegal floor share'), roadKm: l('道路（公里）', 'Roads (km)'),
  firms: l('企业', 'Firms'), pickArea: l('点击地图上的片区', 'Click an area on the map'),
  rapport: l('默契', 'Rapport'), standing: l('上级评价', 'Standing'), disciplineRisk: l('纪律风险', 'Discipline risk'),
  shortcuts: l('记录在案的捷径', 'Shortcuts on record'), falls: l('撤换', 'Replacements'),
  thisYear: l('今年的考核指标', "This year's review"), projected: l('按现在算的得分', 'Score if held now'),
  target: l('目标', 'Target'), floor: l('底线', 'Floor'), value: l('现值', 'Now'), held: l('已进行的考核', 'Reviews held'),
  pass: l('通过', 'pass'), fail: l('未通过', 'fail'), vetoed: l('一票否决', 'vetoed'), noReviewLeft: l('没有更多考核', 'No review left'),
  enforcement: l('违建执法力度', 'Enforcement against illegal floors'), permits: l('暂住证政策', 'Temporary permits'),
  drawZone: l('画一个区块：选用途，在地图上拖动', 'Draw a zone: pick a use, then drag on the map'),
  drawOff: l('不画', 'Not drawing'),
  template: l('历史规划', 'The historical plan'), apply: l('采用', 'Apply'),
  removeZone: l('撤销区块', 'Remove zone'), cells: l('格', 'cells'),
  commit: l('立项', 'Commit'), target_: l('地点', 'Where'), priority: l('优先级', 'Priority'),
  projectsList: l('项目', 'Projects'), cancel: l('取消', 'Cancel'),
  teams: l('施工队伍', 'Construction teams'), contract: l('签约（统筹使用）', 'Contract (pool)'), live: l('在场', 'on site'),
  verdict: l('结局', 'The verdict'), growth: l('增长（相对第一年）', 'Growth (over the first year)'),
  fiscalTest: l('财政检验（不计补助）', 'The fiscal test (without the grant)'), reserve: l('储备', 'Reserve'),
  debt: l('债务', 'Debt'), arrears: l('拖欠', 'Arrears'), ended: l('试玩结束', 'The slice is over'),
  failure: l('因上级关注度过高被撤职', 'Removed: scrutiny stayed too high'),
  report: l('报告', 'Report'), preview: l('预估', 'Preview'), opensIn: l('个月后开工', 'months to open'),
  bedsNeeded: l('需要床位', 'Beds needed'), powerNeed: l('用电', 'Power'), powerFree: l('富余电力', 'Spare power'),
  perYearOutput: l('满产年产值', 'Output a year at full ramp'), cash: l('本季度现金', 'Cash this quarter'),
  retained: l('每年留成税收', 'Retained tax a year'), newObligations: l('每年新增支出', 'New obligations a year'),
  shortfall: l('缺口', 'Shortfall'), capacity: l('可借', 'Can borrow'), principal: l('本金', 'Principal'),
  rate: l('月利率', 'Monthly rate'), grace: l('宽限期（月）', 'Grace (months)'), term: l('期限（月）', 'Term (months)'),
  bar: l('准备程度', 'Readiness'), readyRoads: l('道路', 'Roads'), readyLand: l('三通一平用地', 'Serviced land'),
  readyWaterPower: l('水电', 'Water and power'),
  mandate: l('任务', 'The mandate'), mandateMet: l('已完成', 'met'), mandateOpen: l('未完成', 'not yet met'),
  noMandate: l('特区成立后确定', 'Set when the zone is established'),
  answerFirst: l('请先回答', 'Answer first'), turnStartOnly: l('指令只能在回合开始时下达', "Orders are given at a turn's start"),
  noSuchCard: l('没有这张卡片', 'No such card'), noSuchOption: l('没有这个选项', 'No such option'), forecast: l('首批投资者预计', 'First wave forecast'), score: l('得分', 'Score'),
  grantFactor: l('补助系数', 'Grant factor'), warning: l('补助将削减', 'The grant will be cut'),
  seed: l('随机种子', 'Seed'), restart: l('重新开始', 'Start again'),
  months: l('个月', 'months'), none: l('无', 'none'),
} as const satisfies Record<string, L>;

/** The two languages side by side, as the UI shows every string. */
export const bi = (s: L) => `${s.zh} ${s.en}`;
