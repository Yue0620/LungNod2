<template>
  <main class="standards-page">
    <div class="container standards-inner">
      <div class="title-banner">
        <div class="banner-inner container">
          <h1>{{ texts.title }}</h1>
          <p class="banner-sub">{{ texts.subtitle }}</p>
        </div>
      </div>

      <header class="standards-header">
        <div class="section-switch">
          <!-- header intentionally minimal; legend appears in metadata section -->
        </div>
      </header>

      <div class="content-layout">
        <aside class="dimension-nav">
          <div class="nav-header">
            <strong>{{ texts.dimensionTitle }}</strong>
          </div>

          <ul class="nav-list">
            <!-- Data Standards root (collapsible) -->
            <li class="nav-root" :class="{ active: activeTop === 'data' }" @click="toggleNav('data')">
              <span class="nav-expand-icon">{{ navExpanded.data ? '▼' : '▶' }}</span>
              <span class="dim-name">{{ texts.dataSectionLabel }}</span>
              <span class="dim-count">({{ dataRows }})</span>
            </li>
            <ul v-if="navExpanded.data" style="list-style:none; padding-left:0.8rem; margin:0 0 0.6rem 0;">
              <li v-for="(ch, ci) in dataChapters" :key="ch.chapter_id" class="nav-child" :class="{ active: activeDimension === ch.chapter_id }" @click="scrollToChapter(ch.chapter_id)">
                <span class="dim-name">{{ chapterDisplayTitle(ch, ci) }}</span>
                <span class="dim-count">({{ (ch.sections||[]).length }})</span>
              </li>
            </ul>

            <!-- Metadata Standards root (collapsible) -->
            <li class="nav-root" :class="{ active: activeTop === 'metadata' }" @click="toggleNav('metadata')">
              <span class="nav-expand-icon">{{ navExpanded.metadata ? '▼' : '▶' }}</span>
              <span class="dim-name">{{ texts.metadataSectionLabel }}</span>
              <span class="dim-count">({{ metadataRows.length }})</span>
            </li>
            <ul v-if="navExpanded.metadata" style="list-style:none; padding-left:0.8rem; margin-top:0.4rem;">
              <li :class="{ active: !activeDimension }" @click="activeDimension = ''; activeTop = 'metadata'" class="nav-child">全部</li>
              <li v-for="dim in dimensionsList" :key="dim" :class="{ active: activeDimension === dim }" @click="activeDimension = dim; activeTop = 'metadata'" class="nav-child">
                <span class="dim-name">{{ dim }}</span>
                <span class="dim-count">({{ rowsWithSpan.filter(r => (r.dimension||'')===dim).length }})</span>
              </li>
            </ul>
          </ul>
        </aside>

        <div class="table-wrap" :class="activeTop === 'data' ? 'table-wrap-full' : ''">
          <!-- Data Standards section -->
          <div v-if="activeTop === 'data'" id="data-standards" style="padding:1rem; background:#fff; border-bottom:1px solid #eef2f7;">
            <h3 style="margin:0 0 0.6rem;">{{ texts.dataSectionLabel }}</h3>

            <div v-for="(ch, ci) in dataChapters" :key="ch.chapter_id" class="data-chapter" :id="'ch-' + ch.chapter_id">
              <h4 class="chapter-title">{{ chapterDisplayTitle(ch, ci) }}</h4>

              <div v-for="sec in (ch.sections||[])" :key="sec.section_id" class="data-section" :id="'sec-' + sec.section_id">
                <h5 class="section-title" @click="toggleSection(sec.section_id)" style="cursor:pointer;">
                  <span class="expand-icon">{{ expandedSections.has(sec.section_id) ? '▼' : '▶' }}</span>
                  {{ sec.title }}
                </h5>

                <div v-if="expandedSections.has(sec.section_id)">
                  <!-- Objective -->
                  <div v-if="getModule(sec, 'objective')" class="data-module objective">
                    <h6 class="table-label">{{ getModule(sec, 'objective').title }}</h6>
                    <p>{{ getModule(sec, 'objective').content }}</p>
                  </div>

                  <!-- Software versions -->
                  <div v-if="getModule(sec, 'software_versions')" class="data-module">
                    <h6 class="table-label">{{ getModule(sec, 'software_versions').title }}</h6>
                  </div>
                  <div v-if="getTable(sec, 'software_versions')" class="data-table-wrap">
                    <table class="standards-table">
                      <thead>
                        <tr>
                          <th v-for="h in getTable(sec, 'software_versions').headers" :key="h">{{ h }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, ri) in getTable(sec, 'software_versions').data" :key="ri">
                          <td v-for="(val, ki) in row" :key="ki">{{ val }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Analysis parameters -->
                  <div v-if="getModule(sec, 'analysis_parameters')" class="data-module">
                    <h6 class="table-label">{{ getModule(sec, 'analysis_parameters').title }}</h6>
                  </div>
                  <div v-if="getTable(sec, 'analysis_parameters')" class="data-table-wrap">
                    <table class="standards-table">
                      <thead>
                        <tr>
                          <th v-for="h in getTable(sec, 'analysis_parameters').headers" :key="h">{{ h }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, ri) in getTable(sec, 'analysis_parameters').data" :key="ri">
                          <td v-for="(val, ki) in row" :key="ki">{{ val }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <!-- Workflow -->
                  <div v-if="getModule(sec, 'workflow')" class="data-module">
                    <h6 class="table-label">{{ getModule(sec, 'workflow').title }}</h6>
                  </div>
                  <div v-if="getTable(sec, 'workflow_rules')" class="data-table-wrap">
                    <table class="standards-table">
                      <thead>
                        <tr>
                          <th v-for="h in getTable(sec, 'workflow_rules').headers" :key="h">{{ h }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, ri) in getTable(sec, 'workflow_rules').data" :key="ri">
                          <td v-for="(val, ki) in row" :key="ki">{{ val }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-if="getModule(sec, 'workflow') && getModule(sec, 'workflow').content" class="data-module workflow">
                    <p>{{ getModule(sec, 'workflow').content }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Metadata Standards section -->
          <div v-if="activeTop === 'metadata'" id="metadata-standards" style="padding:1rem; background:#fff; margin-top:1rem;">
            <h3 style="margin:0 0 0.6rem;">{{ texts.metadataSectionLabel }}</h3>

            <div class="legend" style="margin-bottom:0.6rem;">{{ texts.legendColors }}</div>

            <div class="per-table-controls">
              <div class="toolbar">
                <div class="filter-group">
                  <span class="toolbar-label">{{ texts.filterLabel }}</span>
                  <button class="filter-btn" :class="{ active: requiredFilter === 'all' }" @click="requiredFilter = 'all'">
                    {{ texts.filterAll }}
                  </button>
                  <button class="filter-btn" :class="{ active: requiredFilter === 'required' }" @click="requiredFilter = 'required'">
                    {{ texts.filterRequired }}
                  </button>
                  <button class="filter-btn" :class="{ active: requiredFilter === 'optional' }" @click="requiredFilter = 'optional'">
                    {{ texts.filterOptional }}
                  </button>
                </div>

                <div class="search-group">
                  <span class="toolbar-label">{{ texts.searchLabel }}</span>
                  <input
                    v-model.trim="searchKeyword"
                    class="search-input"
                    :placeholder="texts.searchPlaceholder"
                    type="text"
                  >
                </div>
              </div>

              <div class="download-group" style="margin-top:0.6rem;">
                <a :href="standardsUrl" download class="download-btn">{{ texts.downloadSpec }}</a>
              </div>

              <p class="count-tip">{{ texts.countLabel }} {{ metadataRows.length }} / {{ rowsWithSpan.length }}</p>
            </div>

            <table class="standards-table">
            <thead>
              <tr>
                <th>{{ texts.dimensionTitle }}</th>
                <th>{{ texts.fieldTitle }}</th>
                <th>{{ texts.detailFieldName }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in metadataRows" :key="row.key">
                <td v-if="row.dimensionRowspan > 0" :rowspan="row.dimensionRowspan" class="dimension-col">{{ row.dimension }}</td>
                <td v-if="row.fieldLevelRowspan > 0" :rowspan="row.fieldLevelRowspan" class="field-col">{{ row.fieldLevel }}</td>
                <td class="chinese-name">
                  <el-tooltip
                    :content="texts.lockTip"
                    placement="top"
                    effect="light"
                    :show-after="120"
                    popper-class="lock-tooltip"
                  >
                    <button
                      class="field-btn"
                      :class="{ active: activeItem && activeItem.key === row.key, 'required-text': (row.required||'').includes('是'), 'optional-text': !((row.required||'').includes('是')) }"
                      @mouseenter="previewItem(row.key)"
                      @mouseleave="clearPreview"
                      @click="selectItem(row.key)"
                    >
                      {{ row.fieldName }}
                    </button>
                  </el-tooltip>
                </td>
              </tr>
            </tbody>
            </table>
          </div>
        </div>

        <aside class="detail-sidebar" v-if="activeTop === 'metadata' && activeItem">
          <h3>{{ texts.detailTitle }}</h3>
          <p class="detail-subtitle">{{ activeItem.dimension }} · {{ activeItem.fieldLevel }}</p>

          <dl class="detail-list">
            <div class="detail-row">
              <dt>{{ texts.detailFieldName }}</dt>
              <dd>{{ activeItem.fieldName }}</dd>
            </div>
            <div class="detail-row">
              <dt>{{ texts.detailExample }}</dt>
              <dd>{{ activeItem.example }}</dd>
            </div>
            <div class="detail-row">
              <dt>{{ texts.detailRequired }}</dt>
              <dd :class="{ 'required-text': (activeItem.required||'').includes('是'), 'optional-text': !((activeItem.required||'').includes('是')) }">{{ activeItem.required }}</dd>
            </div>
            <div class="detail-row">
              <dt>{{ texts.detailType }}</dt>
              <dd>{{ activeItem.typeFormat }}</dd>
            </div>
            <!-- removed empty录入约束 row per request -->
            <div class="detail-row">
              <dt>{{ texts.detailDesc }}</dt>
              <dd>{{ activeItem.description }}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  </main>
</template>

<script>
import { currentLang } from '@/store/lang.js';
import standardsRaw from '@/data/St.txt?raw';
import standardsUrl from '@/data/St.txt?url';
import dataStandardsJson from '@/data/Data Standards.json';

const uiDictionary = {
  zh: {
    title: '肺结节数据库数据标准',
    subtitle: '点击字段层级可在右侧查看细粒度字段说明。',
    legendColors: '绿色表示必填字段；灰色表示选填字段。',
    countLabel: '当前条目数：',
    filterLabel: '筛选：',
    filterAll: '全部',
    filterRequired: '必填',
    filterOptional: '选填',
    searchLabel: '搜索：',
    searchPlaceholder: '按字段名/说明检索',
    dimensionTitle: '维度分类',
    fieldTitle: '字段层级',
    detailTitle: '字段细节',
    detailFieldName: '字段名称（中文）',
    detailExample: '示例值',
    detailRequired: '是否必填',
    detailType: '字段类型/格式',
    detailFormat: '录入约束',
    detailDesc: '字段解释',
    typeFormatTitle: '字段类型 / 格式',
    dataSectionLabel: '数据标准',
    metadataSectionLabel: '元数据标准',
    legendPrefix: '说明：',
    lockTip: '点击锁定',
    downloadSpec: '下载元数据规范 (St.txt)'
  },
  en: {
    title: 'Lung Nodule Data Standards',
    subtitle: 'Click a field to inspect detailed metadata in the sidebar.',
    legendColors: 'Green indicates required fields; gray indicates optional fields.',
    countLabel: 'Items: ',
    filterLabel: 'Filter:',
    filterAll: 'All',
    filterRequired: 'Required',
    filterOptional: 'Optional',
    searchLabel: 'Search:',
    searchPlaceholder: 'Search by field or description',
    dimensionTitle: 'Dimension',
    fieldTitle: 'Field',
    detailTitle: 'Field Detail',
    detailFieldName: 'Field Name',
    detailExample: 'Example',
    detailRequired: 'Required',
    detailType: 'Type',
    detailFormat: 'Constraint',
    detailDesc: 'Description',
    typeFormatTitle: 'Type / Format',
    dataSectionLabel: 'Data Standards',
    metadataSectionLabel: 'Metadata Standards',
    legendPrefix: 'Legend:',
    lockTip: 'Click to lock',
    downloadSpec: 'Download metadata spec (St.txt)'
  }
};

const sectionDefs = [
  { key: 'basic', label: { zh: '一、基础通用信息', en: 'I. Basic General Information' } },
  { key: 'clinical', label: { zh: '二、临床信息', en: 'II. Clinical Information' } },
  { key: 'imaging', label: { zh: '三、影像信息', en: 'III. Imaging Information' } },
  { key: 'sampling', label: { zh: '四、采样信息', en: 'IV. Sampling Information' } },
  { key: 'pathology', label: { zh: '五、病理信息', en: 'V. Pathology Information' } },
  { key: 'treatment', label: { zh: '六、治疗信息', en: 'VI. Treatment Information' } },
  { key: 'followup', label: { zh: '七、随访信息', en: 'VII. Follow-up Information' } }
];

const dataSectionDefs = [
  { key: 'genomics', label: { zh: '一、基因组分析标准', en: 'I. Genomics Analysis Standards' } },
  { key: 'transcriptomics', label: { zh: '二、转录组标准', en: 'II. Transcriptomics Standards' } },
  { key: 'spatial', label: { zh: '三、空间转录组标准', en: 'III. Spatial Transcriptomics Standards' } },
  { key: 'epigenomics', label: { zh: '四、表观组标准（DNA/RNA）', en: 'IV. Epigenomics Standards (DNA/RNA)' } },
  { key: 'chromatin', label: { zh: '五、染色质表观组标准', en: 'V. Chromatin Epigenomics Standards' } }
];

const standardsCatalog = [
  { key: 'case-uid', section: 'basic', label: '病例唯一编码', detail: { fieldName: '病例唯一编码', example: 'PanG_001', required: '是', type: '字符串', format: '字母数字下划线，不可重复', description: '用于全库唯一识别受试者与病例。' } },
  { key: 'subject-id', section: 'basic', label: '受试者ID', detail: { fieldName: '受试者ID', example: 'SUBJ000245', required: '是', type: '字符串', format: '中心代码+流水号', description: '同一受试者跨批次数据绑定键。' } },
  { key: 'center-id', section: 'basic', label: '中心ID', detail: { fieldName: '中心ID', example: 'LN_SH_01', required: '是', type: '字符串', format: '站点编码', description: '用于多中心来源追溯和分层统计。' } },
  { key: 'sex', section: 'basic', label: '性别', detail: { fieldName: '性别', example: '男', required: '是', type: '枚举', format: '男/女/未知', description: '人口学基础变量。' } },
  { key: 'birth-date', section: 'basic', label: '出生年月', detail: { fieldName: '出生年月', example: '1985-10', required: '是', type: '日期', format: 'YYYY-MM', description: '用于年龄计算。' } },
  { key: 'enroll-date', section: 'basic', label: '入组日期', detail: { fieldName: '入组日期', example: '2025-06-10', required: '是', type: '日期', format: 'YYYY-MM-DD', description: '定义随访起点。' } },
  { key: 'height-cm', section: 'basic', label: '身高(cm)', detail: { fieldName: '身高', example: '170', required: '是', type: '数值', format: 'cm，0-300', description: '个体基线体征。' } },
  { key: 'weight-kg', section: 'basic', label: '体重(kg)', detail: { fieldName: '体重', example: '63.5', required: '是', type: '数值', format: 'kg，0-500', description: '个体基线体征。' } },
  { key: 'bmi', section: 'basic', label: 'BMI', detail: { fieldName: 'BMI', example: '21.97', required: '否', type: '数值', format: '自动计算或手填', description: '用于肥胖相关分析。' } },
  { key: 'ethnicity', section: 'basic', label: '民族', detail: { fieldName: '民族', example: '汉族', required: '否', type: '枚举', format: '国家标准民族枚举', description: '用于群体差异分析。' } },
  { key: 'smoking-status', section: 'basic', label: '吸烟状态', detail: { fieldName: '吸烟状态', example: '既往吸烟', required: '否', type: '枚举', format: '从不/当前/既往', description: '吸烟暴露一级分类。' } },
  { key: 'smoking-start-age', section: 'basic', label: '开始吸烟年龄', detail: { fieldName: '开始吸烟年龄', example: '22', required: '否', type: '整数', format: '岁，0-120', description: '用于吸烟年限计算。' } },
  { key: 'smoking-years', section: 'basic', label: '吸烟年限', detail: { fieldName: '吸烟年限', example: '25', required: '否', type: '整数', format: '年，0-120', description: '反映暴露时长。' } },
  { key: 'cigarettes-per-day', section: 'basic', label: '日吸烟量(支)', detail: { fieldName: '日吸烟量', example: '20', required: '否', type: '整数', format: '支/日，0-200', description: '用于pack-year计算。' } },
  { key: 'quit-smoking-years', section: 'basic', label: '戒烟时长(年)', detail: { fieldName: '戒烟时长', example: '3', required: '否', type: '整数', format: '年，0-100', description: '衡量戒烟后的恢复窗口。' } },
  { key: 'drinking-status', section: 'basic', label: '饮酒状态', detail: { fieldName: '饮酒状态', example: '偶尔', required: '否', type: '枚举', format: '从不/偶尔/经常/已戒', description: '生活方式暴露变量。' } },
  { key: 'occupation-exposure', section: 'basic', label: '职业暴露史', detail: { fieldName: '职业暴露史', example: '石棉暴露15年', required: '否', type: '字符串', format: '暴露类型+时长', description: '记录职业相关致病风险。' } },
  { key: 'air-pollution-exposure', section: 'basic', label: '环境污染暴露', detail: { fieldName: '环境污染暴露', example: '长期PM2.5高暴露', required: '否', type: '字符串', format: '文本描述', description: '记录区域空气污染影响。' } },
  { key: 'family-tumor-history', section: 'basic', label: '家族肿瘤史', detail: { fieldName: '家族肿瘤史', example: '父亲肺癌', required: '否', type: '字符串', format: '亲属关系+肿瘤类型', description: '用于遗传风险分析。' } },
  { key: 'comorbidity', section: 'basic', label: '既往疾病史', detail: { fieldName: '既往疾病史', example: '高血压、糖尿病', required: '是', type: '字符串', format: '可多选/分号分隔', description: '用于协变量校正。' } },
  { key: 'medication-history', section: 'basic', label: '长期用药史', detail: { fieldName: '长期用药史', example: '阿司匹林 100mg qd', required: '否', type: '字符串', format: '药名+剂量+频次', description: '用于药物影响评估。' } },

  { key: 'chief-complaint', section: 'clinical', label: '主诉', detail: { fieldName: '主诉', example: '体检发现肺结节', required: '是', type: '字符串', format: '文本', description: '就诊触发事件。' } },
  { key: 'symptom-cough', section: 'clinical', label: '咳嗽', detail: { fieldName: '咳嗽', example: '间断性干咳2周', required: '否', type: '枚举+文本', format: '有/无 + 描述', description: '症状体征条目之一。' } },
  { key: 'symptom-hemoptysis', section: 'clinical', label: '咯血', detail: { fieldName: '咯血', example: '无', required: '否', type: '枚举', format: '有/无', description: '警示性呼吸系统症状。' } },
  { key: 'symptom-chestpain', section: 'clinical', label: '胸痛', detail: { fieldName: '胸痛', example: '偶发刺痛', required: '否', type: '枚举+文本', format: '有/无 + 描述', description: '症状体征条目之一。' } },
  { key: 'vital-temp', section: 'clinical', label: '体温', detail: { fieldName: '体温', example: '36.7', required: '否', type: '数值', format: '摄氏度', description: '生命体征。' } },
  { key: 'vital-spo2', section: 'clinical', label: '血氧饱和度(SpO2)', detail: { fieldName: 'SpO2', example: '98', required: '否', type: '数值', format: '%', description: '呼吸状态评估。' } },
  { key: 'lab-cyfra21', section: 'clinical', label: 'CYFRA21-1', detail: { fieldName: 'CYFRA21-1', example: '2.8', required: '否', type: '数值', format: 'ng/mL', description: '常见肺癌相关肿瘤标志物。' } },
  { key: 'lab-cea', section: 'clinical', label: 'CEA', detail: { fieldName: 'CEA', example: '3.1', required: '否', type: '数值', format: 'ng/mL', description: '肿瘤标志物。' } },
  { key: 'lab-nse', section: 'clinical', label: 'NSE', detail: { fieldName: 'NSE', example: '11.4', required: '否', type: '数值', format: 'ng/mL', description: '神经内分泌相关指标。' } },
  { key: 'lab-wbc', section: 'clinical', label: '白细胞计数(WBC)', detail: { fieldName: 'WBC', example: '6.5', required: '否', type: '数值', format: '10^9/L', description: '基础炎症指标。' } },
  { key: 'lab-neu', section: 'clinical', label: '中性粒细胞(NEU)', detail: { fieldName: 'NEU', example: '4.1', required: '否', type: '数值', format: '10^9/L', description: '炎症活动评估。' } },
  { key: 'lab-lym', section: 'clinical', label: '淋巴细胞(LYM)', detail: { fieldName: 'LYM', example: '1.8', required: '否', type: '数值', format: '10^9/L', description: '免疫状态评估。' } },
  { key: 'lab-hb', section: 'clinical', label: '血红蛋白(HB)', detail: { fieldName: 'HB', example: '132', required: '否', type: '数值', format: 'g/L', description: '贫血相关指标。' } },
  { key: 'lab-plt', section: 'clinical', label: '血小板(PLT)', detail: { fieldName: 'PLT', example: '238', required: '否', type: '数值', format: '10^9/L', description: '凝血相关基础指标。' } },
  { key: 'lab-alt', section: 'clinical', label: '丙氨酸氨基转移酶(ALT)', detail: { fieldName: 'ALT', example: '22', required: '否', type: '数值', format: 'U/L', description: '肝功能指标。' } },
  { key: 'lab-ast', section: 'clinical', label: '天门冬氨酸氨基转移酶(AST)', detail: { fieldName: 'AST', example: '20', required: '否', type: '数值', format: 'U/L', description: '肝功能指标。' } },
  { key: 'lab-alb', section: 'clinical', label: '白蛋白(ALB)', detail: { fieldName: 'ALB', example: '41.2', required: '否', type: '数值', format: 'g/L', description: '营养和肝功评估。' } },
  { key: 'lab-cr', section: 'clinical', label: '肌酐(Cr)', detail: { fieldName: 'Cr', example: '73', required: '否', type: '数值', format: 'umol/L', description: '肾功能指标。' } },
  { key: 'lab-bun', section: 'clinical', label: '尿素氮(BUN)', detail: { fieldName: 'BUN', example: '5.1', required: '否', type: '数值', format: 'mmol/L', description: '肾功能指标。' } },
  { key: 'lab-glu', section: 'clinical', label: '空腹血糖(GLU)', detail: { fieldName: 'GLU', example: '5.4', required: '否', type: '数值', format: 'mmol/L', description: '代谢状态评估。' } },
  { key: 'lab-crp', section: 'clinical', label: 'C反应蛋白(CRP)', detail: { fieldName: 'CRP', example: '2.3', required: '否', type: '数值', format: 'mg/L', description: '炎症活性指标。' } },
  { key: 'lab-dimer', section: 'clinical', label: 'D-二聚体', detail: { fieldName: 'D-二聚体', example: '0.26', required: '否', type: '数值', format: 'mg/L FEU', description: '凝血/血栓风险指标。' } },
  { key: 'lab-period', section: 'clinical', label: '化验时间点', detail: { fieldName: '化验时间点', example: '术前', required: '是', type: '枚举', format: '术前/术后/随访', description: '支持不同阶段纵向对比。' } },
  { key: 'ct-vendor', section: 'clinical', label: 'CT设备厂商', detail: { fieldName: 'CT设备厂商', example: 'GE', required: '是', type: '枚举', format: 'GE/Siemens/Philips/Canon', description: '设备来源字段。' } },
  { key: 'ct-model', section: 'clinical', label: 'CT设备型号', detail: { fieldName: 'CT设备型号', example: 'Revolution CT', required: '是', type: '字符串', format: '型号文本', description: '设备参数追溯。' } },
  { key: 'ct-slice-thickness', section: 'clinical', label: '层厚', detail: { fieldName: '层厚', example: '1.0', required: '是', type: '数值', format: 'mm', description: '影像重建关键参数。' } },
  { key: 'ct-kvp', section: 'clinical', label: '管电压(kVp)', detail: { fieldName: '管电压', example: '120', required: '否', type: '整数', format: 'kVp', description: '扫描参数。' } },
  { key: 'ct-ma', section: 'clinical', label: '管电流(mA)', detail: { fieldName: '管电流', example: '180', required: '否', type: '整数', format: 'mA', description: '扫描参数。' } },

  { key: 'nodule-index', section: 'imaging', label: '结节编号', detail: { fieldName: '结节编号', example: 'NOD_01', required: '是', type: '字符串', format: '病例内唯一', description: '同一病例多结节的标识。' } },
  { key: 'nodule-lobe', section: 'imaging', label: '结节所在叶段', detail: { fieldName: '结节所在叶段', example: '右上叶前段', required: '是', type: '枚举', format: '肺叶/肺段标准命名', description: '用于空间定位分析。' } },
  { key: 'nodule-long-axis', section: 'imaging', label: '长径(mm)', detail: { fieldName: '长径', example: '8.6', required: '是', type: '数值', format: 'mm', description: '结节大小核心变量。' } },
  { key: 'nodule-short-axis', section: 'imaging', label: '短径(mm)', detail: { fieldName: '短径', example: '6.2', required: '是', type: '数值', format: 'mm', description: '结节大小核心变量。' } },
  { key: 'nodule-volume', section: 'imaging', label: '体积(mm3)', detail: { fieldName: '体积', example: '180.4', required: '否', type: '数值', format: 'mm3', description: '用于增长率分析。' } },
  { key: 'nodule-density-type', section: 'imaging', label: '密度类型', detail: { fieldName: '密度类型', example: '部分实性', required: '是', type: '枚举', format: '实性/纯磨玻璃/部分实性', description: '影像分型关键字段。' } },
  { key: 'nodule-ct-value', section: 'imaging', label: '平均CT值(HU)', detail: { fieldName: '平均CT值', example: '-280', required: '否', type: '数值', format: 'HU', description: '量化密度表征。' } },
  { key: 'nodule-shape', section: 'imaging', label: '形态', detail: { fieldName: '形态', example: '类圆形', required: '否', type: '枚举', format: '圆形/类圆形/不规则', description: '结构特征。' } },
  { key: 'nodule-margin', section: 'imaging', label: '边缘清晰度', detail: { fieldName: '边缘清晰度', example: '清晰', required: '否', type: '枚举', format: '清晰/模糊', description: '边缘特征。' } },
  { key: 'nodule-lobulation', section: 'imaging', label: '分叶征', detail: { fieldName: '分叶征', example: '轻度', required: '否', type: '枚举', format: '无/轻度/明显', description: '恶性相关征象。' } },
  { key: 'nodule-spiculation', section: 'imaging', label: '毛刺征', detail: { fieldName: '毛刺征', example: '无', required: '否', type: '枚举', format: '有/无', description: '恶性相关征象。' } },
  { key: 'nodule-vacuole', section: 'imaging', label: '空泡征', detail: { fieldName: '空泡征', example: '无', required: '否', type: '枚举', format: '有/无', description: '结节内部结构征象。' } },
  { key: 'nodule-cavity', section: 'imaging', label: '空洞征', detail: { fieldName: '空洞征', example: '无', required: '否', type: '枚举', format: '有/无', description: '结节内部结构征象。' } },
  { key: 'nodule-calcification', section: 'imaging', label: '钙化', detail: { fieldName: '钙化', example: '点状钙化', required: '否', type: '枚举', format: '无/点状/弥漫', description: '良恶性鉴别征象。' } },
  { key: 'nodule-pleural-tag', section: 'imaging', label: '胸膜牵拉', detail: { fieldName: '胸膜牵拉', example: '有', required: '否', type: '枚举', format: '有/无', description: '侵袭性相关征象。' } },
  { key: 'nodule-vessel-convergence', section: 'imaging', label: '血管集束征', detail: { fieldName: '血管集束征', example: '无', required: '否', type: '枚举', format: '有/无', description: '恶性风险评估。' } },
  { key: 'nodule-growth', section: 'imaging', label: '结节增长趋势', detail: { fieldName: '结节增长趋势', example: '6个月增长1.2mm', required: '否', type: '字符串', format: '时间+变化量', description: '动态变化关键指标。' } },

  { key: 'sampling-stage', section: 'sampling', label: '采样阶段', detail: { fieldName: '采样阶段', example: '术前', required: '是', type: '枚举', format: '术前/术中/术后/随访', description: '采样时间点标准化字段。' } },
  { key: 'sample-type', section: 'sampling', label: '样本类型', detail: { fieldName: '样本类型', example: '外周血', required: '是', type: '枚举', format: '血液/组织/痰液/尿液', description: '多组学来源标识。' } },
  { key: 'sample-source', section: 'sampling', label: '样本来源部位', detail: { fieldName: '样本来源部位', example: '肿瘤组织边缘', required: '否', type: '字符串', format: '文本', description: '组织样本来源定位。' } },
  { key: 'sample-collect-time', section: 'sampling', label: '采样时间', detail: { fieldName: '采样时间', example: '2025-06-11 09:23', required: '是', type: '日期时间', format: 'YYYY-MM-DD HH:mm', description: '样本时序精确记录。' } },
  { key: 'sample-fasting', section: 'sampling', label: '采样前禁食状态', detail: { fieldName: '采样前禁食状态', example: '空腹8小时', required: '否', type: '字符串', format: '文本', description: '用于代谢指标解释。' } },
  { key: 'sample-volume', section: 'sampling', label: '采样量', detail: { fieldName: '采样量', example: '5', required: '否', type: '数值', format: 'mL/g', description: '样本充足性评估。' } },
  { key: 'sample-anticoagulant', section: 'sampling', label: '抗凝剂类型', detail: { fieldName: '抗凝剂类型', example: 'EDTA', required: '否', type: '枚举', format: 'EDTA/肝素/无', description: '影响下游检测一致性。' } },
  { key: 'sample-process-window', section: 'sampling', label: '采后处理时长', detail: { fieldName: '采后处理时长', example: '35', required: '否', type: '整数', format: '分钟', description: '样本前处理质控指标。' } },
  { key: 'sample-storage-temp', section: 'sampling', label: '保存温度', detail: { fieldName: '保存温度', example: '-80', required: '否', type: '数值', format: '摄氏度', description: '冷链保存关键条件。' } },
  { key: 'sample-freeze-thaw', section: 'sampling', label: '冻融次数', detail: { fieldName: '冻融次数', example: '1', required: '否', type: '整数', format: '次', description: '评估样本稳定性。' } },

  { key: 'pathology-type', section: 'pathology', label: '病理类型', detail: { fieldName: '病理类型', example: '浸润性腺癌', required: '是', type: '枚举', format: 'WHO病理分类', description: '病理诊断主字段。' } },
  { key: 'pathology-subtype', section: 'pathology', label: '病理亚型', detail: { fieldName: '病理亚型', example: '腺泡型', required: '否', type: '枚举', format: '标准亚型枚举', description: '细分病理形态学亚型。' } },
  { key: 'pathology-grade', section: 'pathology', label: '分化等级', detail: { fieldName: '分化等级', example: '中分化', required: '否', type: '枚举', format: '高/中/低', description: '恶性程度相关指标。' } },
  { key: 'pathology-size', section: 'pathology', label: '病理最大径(mm)', detail: { fieldName: '病理最大径', example: '9', required: '否', type: '数值', format: 'mm', description: '术后病理尺寸。' } },
  { key: 'pathology-pleura-invasion', section: 'pathology', label: '胸膜侵犯', detail: { fieldName: '胸膜侵犯', example: 'PL1', required: '否', type: '枚举', format: 'PL0/PL1/PL2', description: '病理侵犯深度。' } },
  { key: 'pathology-vascular-invasion', section: 'pathology', label: '血管侵犯', detail: { fieldName: '血管侵犯', example: '无', required: '否', type: '枚举', format: '有/无', description: '侵袭性相关病理征象。' } },
  { key: 'pathology-nerve-invasion', section: 'pathology', label: '神经侵犯', detail: { fieldName: '神经侵犯', example: '无', required: '否', type: '枚举', format: '有/无', description: '侵袭性相关病理征象。' } },
  { key: 'pathology-lymph-node', section: 'pathology', label: '淋巴结转移', detail: { fieldName: '淋巴结转移', example: 'N0', required: '是', type: '枚举', format: 'N0/N1/N2/N3', description: 'TNM分期组成。' } },
  { key: 'pathology-tnm', section: 'pathology', label: 'TNM分期', detail: { fieldName: 'TNM分期', example: 'T1N0M0', required: '是', type: '字符串', format: 'AJCC格式', description: '标准临床分期字段。' } },
  { key: 'pathology-ttf1', section: 'pathology', label: 'IHC: TTF-1', detail: { fieldName: 'TTF-1', example: '阳性', required: '否', type: '枚举', format: '阳性/阴性/弱阳', description: '免疫组化标志物。' } },
  { key: 'pathology-napsina', section: 'pathology', label: 'IHC: Napsin A', detail: { fieldName: 'Napsin A', example: '阳性', required: '否', type: '枚举', format: '阳性/阴性', description: '免疫组化标志物。' } },
  { key: 'pathology-ki67', section: 'pathology', label: 'IHC: Ki-67', detail: { fieldName: 'Ki-67', example: '12%', required: '否', type: '数值', format: '%', description: '增殖活性指标。' } },

  { key: 'surgery-flag', section: 'treatment', label: '是否手术', detail: { fieldName: '是否手术', example: '是', required: '是', type: '枚举', format: '是/否', description: '治疗路径分流字段。' } },
  { key: 'surgery-date', section: 'treatment', label: '手术日期', detail: { fieldName: '手术日期', example: '2025-06-14', required: '否', type: '日期', format: 'YYYY-MM-DD', description: '手术治疗时间节点。' } },
  { key: 'surgery-method', section: 'treatment', label: '手术方式', detail: { fieldName: '手术方式', example: '胸腔镜楔形切除', required: '否', type: '枚举+文本', format: '标准术式枚举', description: '手术技术路径记录。' } },
  { key: 'surgery-scope', section: 'treatment', label: '切除范围', detail: { fieldName: '切除范围', example: '右上叶楔形', required: '否', type: '字符串', format: '肺叶/肺段描述', description: '术中切除范围。' } },
  { key: 'surgery-margin', section: 'treatment', label: '切缘状态', detail: { fieldName: '切缘状态', example: '阴性', required: '否', type: '枚举', format: '阴性/阳性', description: '手术根治性评价。' } },
  { key: 'surgery-complication', section: 'treatment', label: '术后并发症', detail: { fieldName: '术后并发症', example: '无', required: '否', type: '字符串', format: '可多选', description: '围手术期安全性指标。' } },
  { key: 'chemo-regimen', section: 'treatment', label: '化疗方案', detail: { fieldName: '化疗方案', example: '培美曲塞+顺铂', required: '否', type: '字符串', format: '药物组合', description: '系统治疗记录。' } },
  { key: 'targeted-drug', section: 'treatment', label: '靶向治疗药物', detail: { fieldName: '靶向治疗药物', example: '奥希替尼', required: '否', type: '字符串', format: '通用名', description: '靶向治疗方案记录。' } },
  { key: 'immunotherapy-drug', section: 'treatment', label: '免疫治疗药物', detail: { fieldName: '免疫治疗药物', example: '帕博利珠单抗', required: '否', type: '字符串', format: '通用名', description: '免疫治疗方案记录。' } },
  { key: 'radiotherapy-dose', section: 'treatment', label: '放疗总剂量', detail: { fieldName: '放疗总剂量', example: '54', required: '否', type: '数值', format: 'Gy', description: '放疗暴露量化字段。' } },
  { key: 'therapy-start-end', section: 'treatment', label: '治疗起止日期', detail: { fieldName: '治疗起止日期', example: '2025-07-01 ~ 2025-09-01', required: '否', type: '日期区间', format: 'YYYY-MM-DD ~ YYYY-MM-DD', description: '用于治疗时长计算。' } },

  { key: 'followup-date', section: 'followup', label: '随访日期', detail: { fieldName: '随访日期', example: '2025-12-01', required: '否', type: '日期', format: 'YYYY-MM-DD', description: '随访时间轴锚点。' } },
  { key: 'followup-type', section: 'followup', label: '随访方式', detail: { fieldName: '随访方式', example: '门诊复诊', required: '否', type: '枚举', format: '门诊/电话/住院/远程', description: '随访数据来源方式。' } },
  { key: 'followup-ct-date', section: 'followup', label: '复查影像日期', detail: { fieldName: '复查影像日期', example: '2025-11-28', required: '否', type: '日期', format: 'YYYY-MM-DD', description: '影像随访时间点。' } },
  { key: 'followup-recurrence', section: 'followup', label: '是否复发', detail: { fieldName: '是否复发', example: '否', required: '否', type: '枚举', format: '是/否', description: '复发终点判定。' } },
  { key: 'followup-recurrence-date', section: 'followup', label: '复发日期', detail: { fieldName: '复发日期', example: '2026-02-19', required: '条件必填', type: '日期', format: 'YYYY-MM-DD', description: '若复发为“是”则必填。' } },
  { key: 'followup-metastasis', section: 'followup', label: '是否转移', detail: { fieldName: '是否转移', example: '否', required: '否', type: '枚举', format: '是/否', description: '远处转移终点判定。' } },
  { key: 'followup-pfs', section: 'followup', label: '无进展生存期(月)', detail: { fieldName: '无进展生存期', example: '14', required: '否', type: '数值', format: '月', description: '预后评估核心终点。' } },
  { key: 'followup-os', section: 'followup', label: '总生存期(月)', detail: { fieldName: '总生存期', example: '28', required: '否', type: '数值', format: '月', description: '预后评估核心终点。' } },
  { key: 'followup-status', section: 'followup', label: '生存状态', detail: { fieldName: '生存状态', example: '生存', required: '否', type: '枚举', format: '生存/死亡/失访', description: '随访终态字段。' } },
  { key: 'followup-death-date', section: 'followup', label: '死亡日期', detail: { fieldName: '死亡日期', example: '2027-04-03', required: '条件必填', type: '日期', format: 'YYYY-MM-DD', description: '若生存状态为死亡则必填。' } },
  { key: 'followup-death-cause', section: 'followup', label: '死亡原因', detail: { fieldName: '死亡原因', example: '肿瘤进展', required: '条件必填', type: '字符串', format: '文本', description: '若生存状态为死亡则建议填写。' } }
];

const dataCatalog = [
  // === Genomics Standards (基因组分析标准) ===
  { key: 'gen-germline-wgs-objective', section: 'genomics', label: '生殖系WGS分析目标', detail: { fieldName: '分析目标', example: '检测种系变异', required: '是', type: '字符串', format: '文本', description: '生殖系全基因组测序的核心分析目标。' } },
  { key: 'gen-germline-wgs-software', section: 'genomics', label: '生殖系WGS核心软件', detail: { fieldName: '推荐软件', example: 'BWA/GATK/Samtools', required: '是', type: '字符串', format: '软件名称列表', description: '生殖系WGS推荐的比对和变异检测软件。' } },
  { key: 'gen-germline-wgs-ref', section: 'genomics', label: '生殖系WGS参考基因组', detail: { fieldName: '参考基因组', example: 'GRCh38/hg38', required: '是', type: '枚举', format: 'GRCh37/GRCh38', description: '基因组版本选择。' } },
  { key: 'gen-germline-wgs-depth', section: 'genomics', label: '生殖系WGS测序深度', detail: { fieldName: '目标深度', example: '30X', required: '是', type: '数值', format: '倍数', description: '推荐30X覆盖度以确保检测准确性。' } },
  { key: 'gen-germline-wes-objective', section: 'genomics', label: '生殖系WES分析目标', detail: { fieldName: '分析目标', example: '检测编码区变异', required: '是', type: '字符串', format: '文本', description: '生殖系全外显子测序的分析目标。' } },
  { key: 'gen-germline-wes-panel', section: 'genomics', label: '生殖系WES捕获试剂', detail: { fieldName: '捕获试剂', example: 'Agilent/Illumina/IDT', required: '是', type: '枚举', format: '厂商+型号', description: '外显子捕获及富集试剂选择。' } },
  { key: 'gen-germline-wes-depth', section: 'genomics', label: '生殖系WES测序深度', detail: { fieldName: '目标深度', example: '100X', required: '是', type: '数值', format: '倍数', description: '推荐100X以上用于可靠的变异检测。' } },
  { key: 'gen-somatic-wgs-objective', section: 'genomics', label: '体系WGS分析目标', detail: { fieldName: '分析目标', example: '检测肿瘤体系变异', required: '是', type: '字符串', format: '文本', description: '肿瘤全基因组体系配对分析。' } },
  { key: 'gen-somatic-wgs-software', section: 'genomics', label: '体系WGS变异检测', detail: { fieldName: '变异检测工具', example: 'MuTect/Strelka/VarScan2', required: '是', type: '字符串', format: '工具列表', description: '体系SNV和Indel检测标准工具。' } },
  { key: 'gen-somatic-wgs-tumor-depth', section: 'genomics', label: '体系WGS肿瘤深度', detail: { fieldName: '肿瘤样本深度', example: '50X', required: '是', type: '数值', format: '倍数', description: '肿瘤样本的推荐测序深度。' } },
  { key: 'gen-somatic-wgs-normal-depth', section: 'genomics', label: '体系WGS正常深度', detail: { fieldName: '正常样本深度', example: '30X', required: '是', type: '数值', format: '倍数', description: '配对正常样本的推荐深度。' } },
  { key: 'gen-somatic-wes-objective', section: 'genomics', label: '体系WES分析目标', detail: { fieldName: '分析目标', example: '编码区体系变异检测', required: '是', type: '字符串', format: '文本', description: '肿瘤编码区变异检测。' } },
  { key: 'gen-somatic-wes-vaf', section: 'genomics', label: '体系WES变异等位基因频率', detail: { fieldName: 'VAF阈值', example: '0.05', required: '否', type: '数值', format: 'WAF范围[0,1]', description: '小于此比例的变异可能被识别为假阳性。' } },
  { key: 'gen-cnv-calling', section: 'genomics', label: '拷贝数变异检测', detail: { fieldName: 'CNV检测工具', example: 'CNVnator/LUMPY/Manta', required: '否', type: '字符串', format: '工具名称', description: '检测结构变异和拷贝数变化。' } },
  { key: 'gen-sv-calling', section: 'genomics', label: '结构变异检测', detail: { fieldName: 'SV检测工具', example: 'Manta/LUMPY/Delly', required: '否', type: '字符串', format: '工具列表', description: '大型染色体重排和结构变异检测。' } },
  { key: 'gen-quality-filter', section: 'genomics', label: '群体质控标准', detail: { fieldName: '质控参数', example: 'PASS/LowQual/HighDP', required: '是', type: '字符串', format: 'VCF质量过滤字符串', description: '变异质量评估和过滤规则。' } },

  // === Transcriptomics Standards (转录组标准) ===
  { key: 'trans-sample-type', section: 'transcriptomics', label: '样本类型', detail: { fieldName: '样本类型', example: '新鲜/冷冻/石蜡', required: '是', type: '枚举', format: '新鲜/冷冻/石蜡包埋', description: '转录组分析样本形式。' } },
  { key: 'trans-rna-extraction', section: 'transcriptomics', label: 'RNA提取方法', detail: { fieldName: '提取方法', example: 'TRIzol/柱层析', required: '是', type: '字符串', format: '试剂或工具名', description: 'RNA完整性和产量影响后续分析。' } },
  { key: 'trans-rna-quality', section: 'transcriptomics', label: 'RNA质量指标', detail: { fieldName: 'RIN值', example: '>7', required: '是', type: '数值', format: 'RIN范围[1,10]', description: 'RNA完整性评估（高通量测序推荐>7）。' } },
  { key: 'trans-library-prep', section: 'transcriptomics', label: '文库构建方法', detail: { fieldName: '建库方法', example: 'Illumina/TruSeq/KAPA', required: '是', type: '字符串', format: '试剂盒名', description: '决定测序读长和链特异性。' } },
  { key: 'trans-strand-specific', section: 'transcriptomics', label: '链特异性', detail: { fieldName: '链特异性', example: '是', required: '是', type: '枚举', format: '是/否', description: '区分正负链转录本必要。' } },
  { key: 'trans-bulk-depth', section: 'transcriptomics', label: 'Bulk RNA-seq深度', detail: { fieldName: '推荐深度', example: '30-50M reads', required: '是', type: '数值', format: '百万reads', description: '基因表达定量的推荐测序深度。' } },
  { key: 'trans-10x-protocol', section: 'transcriptomics', label: '10X Chromium协议', detail: { fieldName: '协议版本', example: '3\' v3.1/5\' v2', required: '是', type: '字符串', format: '版本号', description: '单细胞测序协议版本。' } },
  { key: 'trans-10x-cell-recovery', section: 'transcriptomics', label: '10X预期细胞数', detail: { fieldName: '目标细胞数', example: '10000', required: '是', type: '整数', format: '细胞数', description: '单细胞文库中恢复的细胞数。' } },
  { key: 'trans-10x-genes-per-cell', section: 'transcriptomics', label: '10X单细胞基因覆盖', detail: { fieldName: '每细胞基因数', example: '>1500', required: '否', type: '数值', format: '基因数', description: '用于细胞质量评估。' } },
  { key: 'trans-fusion-software', section: 'transcriptomics', label: '融合基因检测', detail: { fieldName: '检测工具', example: 'STAR-Fusion/FusionCatcher', required: '否', type: '字符串', format: '工具列表', description: '转录本融合检测标准工具。' } },
  { key: 'trans-splice-software', section: 'transcriptomics', label: '可变剪接检测', detail: { fieldName: '检测工具', example: 'rMATS/SUPPA2', required: '否', type: '字符串', format: '工具名', description: '检测异常剪接事件。' } },
  { key: 'trans-quantification', section: 'transcriptomics', label: '基因定量方法', detail: { fieldName: '定量工具', example: 'RSEM/Salmon/Kallisto', required: '是', type: '字符串', format: '工具名', description: '基因表达定量标准方法。' } },
  { key: 'trans-reference-gtf', section: 'transcriptomics', label: 'GTF参考注释', detail: { fieldName: '参考注释版本', example: 'Ensembl/GENCODE', required: '是', type: '字符串', format: '数据库+版本', description: '基因注释选择影响定量准确性。' } },

  // === Spatial Transcriptomics Standards (空间转录组标准) ===
  { key: 'spatial-visium-protocol', section: 'spatial', label: '10X Visium FFPE协议', detail: { fieldName: '协议名', example: 'Visium FFPE', required: '是', type: '字符串', format: '产品型号', description: '石蜡包埋组织空间转录组技术。' } },
  { key: 'spatial-visium-spot-size', section: 'spatial', label: 'Visium点阵大小', detail: { fieldName: '点阵直径', example: '55 um', required: '是', type: '数值', format: '微米', description: '空间分辨率定义。' } },
  { key: 'spatial-visium-slice-thickness', section: 'spatial', label: 'Visium切片厚度', detail: { fieldName: '厚度', example: '10 um', required: '是', type: '数值', format: '微米', description: '组织切片标准厚度。' } },
  { key: 'spatial-visium-spots-per-chip', section: 'spatial', label: 'Visium芯片点数', detail: { fieldName: '总点数', example: '5000+', required: '是', type: '整数', format: '点数', description: 'Visium芯片容纳的捕获点。' } },
  { key: 'spatial-visium-depth', section: 'spatial', label: 'Visium推荐测序深度', detail: { fieldName: '深度', example: '100M+ reads', required: '是', type: '数值', format: 'Reads', description: '每芯片推荐测序覆盖度。' } },
  { key: 'spatial-xenium-protocol', section: 'spatial', label: '10X Xenium原位协议', detail: { fieldName: '协议名', example: 'Xenium In Situ', required: '是', type: '字符串', format: '产品名', description: '高分辨率原位RNA检测。' } },
  { key: 'spatial-xenium-resolution', section: 'spatial', label: 'Xenium空间分辨率', detail: { fieldName: '分辨率', example: '<10 um', required: '是', type: '数值', format: '微米', description: '亚细胞级空间分辨率。' } },
  { key: 'spatial-xenium-gene-panel', section: 'spatial', label: 'Xenium基因面板', detail: { fieldName: '基因数', example: '96-500+', required: '是', type: '整数', format: '基因数', description: 'Xenium多路复用容量。' } },
  { key: 'spatial-image-register', section: 'spatial', label: '空间图像配准', detail: { fieldName: '配准工具', example: 'Loupe/Spaceranger', required: '是', type: '字符串', format: '软件工具', description: '转录组与组织形态学图像对齐。' } },
  { key: 'spatial-cluster-analysis', section: 'spatial', label: '空间聚类分析', detail: { fieldName: '分析工具', example: 'seurat/scanpy', required: '是', type: '字符串', format: '软件包名', description: '识别空间区域和细胞类型。' } },

  // === Epigenomics Standards (DNA/RNA Epigenomics) ===
  { key: 'epi-medip-material', section: 'epigenomics', label: 'MeDIP-seq起始物质', detail: { fieldName: '起始物量', example: '500ng-1ug', required: '是', type: '数值', format: 'DNA纳克', description: '甲基化检测推荐DNA用量。' } },
  { key: 'epi-medip-antibody', section: 'epigenomics', label: 'MeDIP抗体', detail: { fieldName: '抗体规格', example: '5mC单克隆', required: '是', type: '字符串', format: '抗体类型', description: '5-甲基胞嘧啶识别。' } },
  { key: 'epi-medip-coverage', section: 'epigenomics', label: 'MeDIP-seq覆盖度', detail: { fieldName: '推荐深度', example: '50-100M reads', required: '是', type: '数值', format: 'Reads数', description: '全基因组甲基化分析深度。' } },
  { key: 'epi-bs-conversion', section: 'epigenomics', label: '亚硫酸盐转化效率', detail: { fieldName: '转化率', example: '>99%', required: '是', type: '数值', format: '百分比', description: '评估BS-seq数据质量关键参数。' } },
  { key: 'epi-bs-mapping', section: 'epigenomics', label: 'BS-seq比对工具', detail: { fieldName: '推荐工具', example: 'Bismark/BSMAP', required: '是', type: '字符串', format: '工具名', description: '甲基化程度定量的标准方法。' } },
  { key: 'epi-m1a-modification', section: 'epigenomics', label: 'm1A修饰分析', detail: { fieldName: '检测方法', example: 'm1A-map-seq/m1A-quant-seq', required: '是', type: '字符串', format: '技术名', description: 'RNA 1-甲基腺苷修饰检测。' } },
  { key: 'epi-m7g-method', section: 'epigenomics', label: 'm7G修饰检测', detail: { fieldName: '分析方法', example: 'm7G-map-seq', required: '是', type: '字符串', format: '方法名', description: 'RNA 7-甲基鸟苷检测。' } },
  { key: 'epi-merip-antibody', section: 'epigenomics', label: 'MeRIP-seq抗体', detail: { fieldName: '抗体靶点', example: 'm6A/m5C单克隆', required: '是', type: '字符串', format: '修饰+抗体类型', description: 'RNA修饰识别特异性抗体。' } },
  { key: 'epi-merip-library', section: 'epigenomics', label: 'MeRIP文库质量', detail: { fieldName: '浓度范围', example: '1-10 ng/ul', required: '是', type: '数值', format: 'ng/ul', description: '文库浓度影响测序覆盖。' } },
  { key: 'epi-merip-depth', section: 'epigenomics', label: 'MeRIP-seq深度', detail: { fieldName: '推荐深度', example: '20-30M reads/样本', required: '是', type: '数值', format: 'Reads', description: 'RNA修饰分析的深度要求。' } },

  // === Chromatin Epigenomics Standards (染色质表观组标准) ===
  { key: 'chrom-atac-material', section: 'chromatin', label: 'ATAC-seq起始细胞数', detail: { fieldName: '细胞数', example: '10000-50000', required: '是', type: '整数', format: '细胞数', description: '转座酶可及性分析所需细胞数。' } },
  { key: 'chrom-atac-transposase', section: 'chromatin', label: 'ATAC转座酶条件', detail: { fieldName: '反应条件', example: '37°C 30min', required: '是', type: '字符串', format: '温度+时长', description: '转座酶活性影响数据质量。' } },
  { key: 'chrom-atac-coverage', section: 'chromatin', label: 'ATAC-seq覆盖度', detail: { fieldName: '推荐深度', example: '50-100M reads', required: '是', type: '数值', format: 'Reads', description: '获得准确核小体定位和峰检测。' } },
  { key: 'chrom-atac-peak-calling', section: 'chromatin', label: 'ATAC-seq峰检测', detail: { fieldName: '工具', example: 'MACS2/HOMER', required: '是', type: '字符串', format: '工具名', description: '开放色质区域鉴定标准工具。' } },
  { key: 'chrom-atac-fragment-size', section: 'chromatin', label: 'ATAC-seq片段大小', detail: { fieldName: '大小范围', example: '30-200bp (核小体前)/50bp', required: '是', type: '字符串', format: 'bp范围', description: '单核核小体与开放区域区分。' } },
  { key: 'chrom-atac-qc-metrics', section: 'chromatin', label: 'ATAC-seq质控指标', detail: { fieldName: '指标', example: 'TSS enrich/peak#', required: '是', type: '字符串', format: '多指标', description: '数据质量综合评估。' } }
];

function pickLangText(value, lang) {
  if (value && typeof value === 'object' && (value.zh || value.en)) {
    return value[lang] || value.zh || value.en;
  }
  return value;
}

function normalizeRequiredValue(rawValue) {
  const value = String(rawValue || '').toLowerCase();
  if (value.includes('是') || value.includes('yes') || value.includes('required') || value.includes('条件')) {
    return 'required';
  }
  if (value.includes('否') || value.includes('no') || value.includes('optional')) {
    return 'optional';
  }
  return 'optional';
}

export default {
  data() {
    return {
      activeItemKey: '',
      hoverItemKey: '',
      isDetailLocked: false,
      requiredFilter: 'all',
      searchKeyword: '',
      activeDimension: '',
      activeSection: 'metadata',
      activeTop: 'metadata',
      expandedSections: new Set(),
      navExpanded: { data: false, metadata: true }
      ,standardsUrl: standardsUrl
    };
  },
  computed: {
    lang() {
      return currentLang.value;
    },
    texts() {
      return uiDictionary[this.lang] || uiDictionary.zh;
    },
    // processed Data Standards chapters
    dataChapters() {
      return dataStandardsJson.chapters || [];
    },
    // parse the provided raw standards file into rows (preserve content)
    fileRows() {
      const text = String(standardsRaw || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
      const rows = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(/\t/);
        let cells = cols.slice(0, 7);
        if (cols.length < 7) {
          cells = cells.concat(Array(7 - cols.length).fill(''));
        } else if (cols.length > 7) {
          cells = cols.slice(0, 6).concat([cols.slice(6).join('\t')]);
        }
        rows.push({
          key: 'r' + i,
          dimension: cells[0] || '',
          fieldLevel: cells[1] || '',
          fieldName: cells[2] || '',
          example: cells[3] || '',
          required: cells[4] || '',
          typeFormat: cells[5] || '',
          description: cells[6] || ''
        });
      }
      return rows;
    },
    // produce rows with effective (inherited) dimension/fieldLevel filled
    effectiveRows() {
      const rows = this.fileRows.map(r => Object.assign({}, r));
      let lastDim = '';
      let lastField = '';
      for (let i = 0; i < rows.length; i++) {
        if ((rows[i].dimension || '').trim() !== '') lastDim = rows[i].dimension.trim();
        else rows[i].dimension = lastDim;
        if ((rows[i].fieldLevel || '').trim() !== '') lastField = rows[i].fieldLevel.trim();
        else rows[i].fieldLevel = lastField;
      }
      return rows;
    },
    // list of unique dimensions for left nav
    dimensionsList() {
      const list = [];
      const seen = new Set();
      for (const r of this.effectiveRows) {
        const d = (r.dimension || '').trim();
        if (d && !seen.has(d)) { list.push(d); seen.add(d); }
      }
      return list;
    },
    // calculate rowspan for dimension and fieldLevel columns
    rowsWithSpan () {
      const rows = this.effectiveRows;
      if (rows.length === 0) return [];
      
      const result = rows.map((row, idx) => ({ ...row }));
      
      // calc rowspan for dimension column (group by equal consecutive dimension values)
      for (let i = 0; i < result.length; i++) {
        if (i === 0 || result[i].dimension !== result[i - 1].dimension) {
          let span = 1;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].dimension === result[i].dimension) span++; else break;
          }
          result[i].dimensionRowspan = span;
        } else {
          result[i].dimensionRowspan = 0;
        }
      }

      // calc rowspan for fieldLevel column (group by equal consecutive fieldLevel values)
      for (let i = 0; i < result.length; i++) {
        if (i === 0 || result[i].fieldLevel !== result[i - 1].fieldLevel) {
          let span = 1;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].fieldLevel === result[i].fieldLevel) span++; else break;
          }
          result[i].fieldLevelRowspan = span;
        } else {
          result[i].fieldLevelRowspan = 0;
        }
      }

      return result;
    },
    // filter by required status and search keyword, but keep dimension/fieldLevel rowspan intact
    filteredRowsWithSpan() {
      let rows = this.rowsWithSpan;
      const keyword = this.searchKeyword.toLowerCase();
      
      // apply required filter
      if (this.requiredFilter !== 'all') {
        rows = rows.filter((row) => {
          const isRequired = row.required.includes('是');
          return this.requiredFilter === 'required' ? isRequired : !isRequired;
        });
      }
      
      // apply search keyword (only search in fieldName, example, typeFormat, description)
      if (keyword) {
        rows = rows.filter((row) => {
          const searchable = [
            row.fieldName,
            row.example,
            row.typeFormat,
            row.description
          ].join(' ').toLowerCase();
          return searchable.includes(keyword);
        });
      }

      // apply active dimension filter when set
      if (this.activeDimension && this.activeDimension !== 'all') {
        rows = rows.filter(r => (r.dimension || '') === this.activeDimension);
      }

      // recalculate rowspan for filtered rows (based on equal consecutive values)
      const result = rows.map((row) => ({ ...row }));
      
      // recalc dimension column rowspan (merge consecutive rows with same dimension)
      for (let i = 0; i < result.length; i++) {
        if (i === 0 || result[i].dimension !== result[i - 1].dimension) {
          let span = 1;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].dimension === result[i].dimension) span++; else break;
          }
          result[i].dimensionRowspan = span;
        } else {
          result[i].dimensionRowspan = 0;
        }
      }
      
      // recalc fieldLevel column rowspan (merge consecutive rows with same fieldLevel)
      for (let i = 0; i < result.length; i++) {
        if (i === 0 || result[i].fieldLevel !== result[i - 1].fieldLevel) {
          let span = 1;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].fieldLevel === result[i].fieldLevel) span++; else break;
          }
          result[i].fieldLevelRowspan = span;
        } else {
          result[i].fieldLevelRowspan = 0;
        }
      }
      
      return result;
    },
    // rows currently displayed for metadata section
    metadataRows() {
      return this.filteredRowsWithSpan;
    },
    // placeholder for data section rows (currently empty)
    dataRows() {
      // total sections count across all data chapters
      return this.dataChapters.reduce((sum, ch) => sum + (ch.sections || []).length, 0);
    },
    // maintain active item based on parsed file rows
    activeItem() {
      const rows = this.effectiveRows;
      if (!rows || rows.length === 0) return null;
      const currentKey = this.isDetailLocked
        ? this.activeItemKey
        : (this.hoverItemKey || this.activeItemKey);
      const base = rows.find((r) => r.key === currentKey) || rows[0];
      return Object.assign({}, base, { dimension: base.dimension, fieldLevel: base.fieldLevel });
    }
  },
  methods: {
    selectItem(itemKey) {
      if (this.isDetailLocked && this.activeItemKey === itemKey) {
        this.isDetailLocked = false;
        return;
      }
      this.activeItemKey = itemKey;
      this.hoverItemKey = '';
      this.isDetailLocked = true;
    },
    previewItem(itemKey) {
      // If another item is hovered while locked, unlock immediately and switch focus.
      if (this.isDetailLocked && this.activeItemKey !== itemKey) {
        this.isDetailLocked = false;
        this.activeItemKey = itemKey;
      }
      if (this.isDetailLocked) return;
      this.hoverItemKey = itemKey;
    },
    clearPreview() {
      if (this.isDetailLocked) return;
      this.hoverItemKey = '';
    }
    ,
    getModule(section, label) {
      return (section.modules || []).find(m => m.module_label === label);
    },
    getTable(section, label) {
      return (section.tables || []).find(t => t.semantic_label === label);
    },
    toggleSection(id) {
      const s = new Set(this.expandedSections);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      this.expandedSections = s;
    },
    toggleNav(key) {
      if (this.navExpanded[key]) {
        this.navExpanded = { ...this.navExpanded, [key]: false };
        return;
      }
      this.navExpanded = { data: false, metadata: false, [key]: true };
      this.activeTop = key;
      this.activeDimension = '';
      this.$nextTick(() => {
        const id = key === 'data' ? 'data-standards' : 'metadata-standards';
        const el = document.getElementById(id);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    chapterDisplayTitle(ch, idx) {
      const cn = ['一','二','三','四','五','六','七','八','九','十'];
      const raw = ch.title || '';
      const stripped = raw.replace(/^\d+\.\s*/, '');
      return (cn[idx] || '') + '、' + stripped;
    },
    scrollToChapter(chapterId) {
      this.activeTop = 'data';
      this.activeDimension = chapterId;
      this.$nextTick(() => {
        const el = document.getElementById('ch-' + chapterId);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    goTop(topKey) {
      this.activeTop = topKey;
      this.activeDimension = '';
      this.$nextTick(() => {
        const id = topKey === 'data' ? 'data-standards' : 'metadata-standards';
        const el = document.getElementById(id);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }
};
</script>

<style scoped>
.standards-page {
  background: #f8fafc;
  min-height: calc(100vh - 160px);
  padding: 2rem 0 3rem;
}

.standards-inner {
  max-width: 1260px;
}

.standards-header {
  margin-bottom: 1.25rem;
}

.standards-header h1 {
  font-size: 1.8rem;
  color: #1e293b;
  margin-bottom: 0.4rem;
}

.standards-header p {
  color: #64748b;
  font-size: 0.98rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 0.8rem;
}

.toolbar-label {
  font-size: 0.9rem;
  color: #334155;
  font-weight: 600;
}

.filter-group,
.search-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.filter-btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 16px;
  padding: 0.2rem 0.7rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.filter-btn.active {
  border-color: #42b983;
  color: #16875d;
  background: #f2fbf7;
  font-weight: 700;
}

.download-btn {
  display: inline-block;
  background: #10b981;
  color: #fff;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  border: 0;
}
.download-btn:hover { background: #059669; }

.search-input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  height: 30px;
  min-width: 240px;
  padding: 0 0.6rem;
  color: #0f172a;
}

.count-tip {
  margin-top: 0.3rem;
  color: #16875d;
  font-weight: 600;
  font-size: 0.9rem;
}

.content-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 360px;
  gap: 1.2rem;
  align-items: start;
}
.table-wrap-full {
  grid-column: 2 / 4;
}

.dimension-nav {
  background: #ffffff;
  border: 1px solid #e6eef6;
  border-radius: 10px;
  padding: 0.6rem;
  height: fit-content;
  position: sticky;
  top: 96px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}
.dimension-nav .nav-header { display:flex; justify-content:space-between; align-items:center; padding:0 0.4rem 0.6rem 0.4rem; }
.dimension-nav .nav-list { list-style:none; padding:0; margin:0; display:block; }
.dimension-nav .nav-list li { padding:0.45rem 0.6rem; cursor:pointer; color:#334155; border-radius:6px; display:flex; justify-content:space-between; align-items:center; }
.dimension-nav .nav-list li:hover { background:#f1f5f9; color: var(--primary-color); }
.dimension-nav .nav-list li.active { background:#e6f7ef; color:var(--primary-color); font-weight:700; }
.dimension-nav .dim-count { color:#64748b; font-size:0.9rem; margin-left:0.5rem; }
.nav-root { font-weight:700; }
.nav-expand-icon { font-size:0.65rem; color:#94a3b8; margin-right:0.3rem; width:0.8rem; }
.nav-child { padding:0.35rem 0.5rem !important; font-size:0.85rem; cursor:pointer; color:#334155; display:flex; justify-content:space-between; align-items:center; border-radius:4px; }
.nav-child:hover { background:#f1f5f9; }
.nav-child.active { background:#e6f7ef; font-weight:600; }

.section-switch { display:flex; justify-content:space-between; align-items:center; margin-top:0.6rem; gap:1rem; }
.section-tabs { display:flex; gap:0.5rem; }
.section-tabs button { border:1px solid #cbd5e1; background:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; color:#334155; font-weight:600; }
.section-tabs button.active { background: var(--primary-color); color:#fff; border-color:var(--primary-color); }
.legend { font-size:0.9rem; color:#64748b; }

.data-chapter {
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.chapter-title {
  background: #42b983;
  color: #fff;
  padding: 0.6rem 1rem;
  margin: 0;
  font-size: 1.05rem;
}
.data-section {
  border-bottom: 1px solid #eef2f7;
}
.data-section:last-child {
  border-bottom: none;
}
.section-title {
  background: #f0fdf4;
  color: #1e293b;
  padding: 0.5rem 1rem;
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.section-title:hover {
  background: #dcfce7;
}
.expand-icon {
  font-size: 0.7rem;
  color: #64748b;
  width: 1em;
}
.data-module {
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  color: #334155;
  line-height: 1.65;
  background: #fff;
}
.data-module.objective p {
  margin: 0;
  white-space: pre-line;
}
.data-module.workflow p {
  margin: 0;
  font-family: monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
}
.table-label {
  margin: 0.8rem 1rem 0.4rem;
  font-size: 0.9rem;
  color: #1e293b;
  font-weight: 600;
}
.data-table-wrap {
  padding: 0 1rem 0.6rem;
}
.data-table-wrap .standards-table {
  font-size: 0.82rem;
}
.data-table-wrap .standards-table th {
  background: #42b983;
  color: #fff;
  font-weight: 600;
  padding: 0.4rem 0.6rem;
}
.data-table-wrap .standards-table td {
  padding: 0.35rem 0.6rem;
  text-align: left;
}
.data-empty { display:flex; align-items:center; justify-content:center; height:360px; background:#fff; border:1px dashed #e6eef6; border-radius:10px; }
.data-empty .empty-inner { color:#64748b; font-size:1rem; font-weight:600; }

@media (max-width: 768px) {
  .content-layout { grid-template-columns: 1fr; }
  .table-wrap-full { grid-column: 1; }
  .dimension-nav { display:none; }
}

.table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.standards-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 500px;
}

.standards-table th,
.standards-table td {
  border: 1px solid #d6d3c4;
  padding: 0.85rem 1rem;
  text-align: center;
  vertical-align: middle;
}

.standards-table thead th {
  background: #42b983;
  color: #fff;
  font-weight: 700;
}

.dimension-col {
  background: #c8e8d8;
  width: 18%;
  font-weight: 600;
  color: #1f2937;
}

.field-col {
  background: #e8f5f0;
  width: 14%;
  color: #111827;
  font-weight: 600;
}

.chinese-name {
  font-weight: 600;
}

.field-btn {
  width: 100%;
  border: 0;
  background: transparent;
  color: #111827;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  padding: 0.2rem 0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.field-btn:hover {
  background: #f2fbf7;
}

.field-btn.active {
  background: #e6f7ef;
  color: var(--primary-color);
  font-weight: 700;
}

.required-text { color: var(--primary-color); font-weight: 700; }
.optional-text { color: #64748b; font-weight: 700; }

:deep(.lock-tooltip) {
  border-color: #a7e6c7 !important;
  color: #166534 !important;
  background: #f0fdf4 !important;
  box-shadow: 0 8px 24px rgba(66, 185, 131, 0.18);
}

:deep(.lock-tooltip .el-popper__arrow::before) {
  border-color: #a7e6c7 !important;
  background: #f0fdf4 !important;
}

.detail-sidebar {
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  padding: 1rem;
  position: sticky;
  top: 96px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.detail-sidebar h3 {
  font-size: 1.1rem;
  color: #1e293b;
  margin-bottom: 0.35rem;
}

.detail-subtitle {
  font-size: 0.9rem;
  color: #475569;
  margin-bottom: 0.8rem;
}

.detail-list {
  display: grid;
  gap: 0.65rem;
}

.detail-row {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.detail-row dt {
  background: #eff6ff;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.4rem 0.55rem;
}

.detail-row dd {
  margin: 0;
  background: #fff;
  color: #0f172a;
  font-size: 0.9rem;
  line-height: 1.55;
  padding: 0.55rem;
}

@media (max-width: 768px) {
  .standards-page {
    padding: 1.2rem 0 2rem;
  }

  .content-layout {
    grid-template-columns: 1fr;
  }

  .detail-sidebar {
    position: static;
  }

  .standards-header h1 {
    font-size: 1.35rem;
  }

  .search-input {
    min-width: 180px;
    width: 100%;
  }

  .standards-table th,
  .standards-table td {
    padding: 0.7rem 0.6rem;
    font-size: 0.9rem;
  }
}
</style>
