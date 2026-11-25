import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/config'
import { currentLang } from '@/store/lang'

export function usePagedTable({ endpoint, filters, keyword, optionsEndpoint, onOptions }) {
  const data = ref([]), loading = ref(true), totalElements = ref(0)
  const currentPage = ref(1), pageSize = ref(20), sortProp = ref(''), sortOrder = ref('')
  const exporting = ref(false)
  const params = computed(() => ({ ...filters(), keyword: keyword.value }))
  let timer, activeRequest, revision = 0, disposed = false
  const message = () => currentLang.value === 'en' ? 'Could not load data. Please retry.' : '数据加载失败，请重试。'
  function queryValues(values) {
    return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : value]).filter(([, value]) => value !== '' && value != null))
  }
  function validate(page) {
    if (!page || !Array.isArray(page.content) || !Number.isFinite(page.totalElements)) throw new Error('Expected a paginated JSON response')
    return page
  }
  async function loadData() {
    clearTimeout(timer)
    activeRequest?.abort()
    const controller = new AbortController(), version = ++revision
    activeRequest = controller; loading.value = true
    try {
      const result = validate(await request({ url: endpoint, params: queryValues({ ...params.value, page: currentPage.value - 1, size: pageSize.value, sort: sortProp.value, order: sortOrder.value }), signal: controller.signal }))
      if (version !== revision || disposed) return
      data.value = result.content; totalElements.value = result.totalElements
    } catch (error) {
      if (!controller.signal.aborted && version === revision && !disposed) { data.value = []; totalElements.value = 0; ElMessage.error(message()) }
    } finally { if (version === revision && !disposed) loading.value = false }
  }
  function schedule(delay = 0) { clearTimeout(timer); timer = setTimeout(loadData, delay) }
  watch(params, () => { activeRequest?.abort(); revision++; currentPage.value = 1; schedule(250) }, { deep: true })
  watch([currentPage, pageSize, sortProp, sortOrder], () => { activeRequest?.abort(); revision++; schedule() })
  watch(pageSize, () => { currentPage.value = 1 })
  onMounted(async () => {
    if (!optionsEndpoint) return
    try { const values = await request({ url: optionsEndpoint }); if (!disposed) onOptions?.(values) }
    catch { if (!disposed) ElMessage.error(message()) }
  })
  onUnmounted(() => { disposed = true; clearTimeout(timer); activeRequest?.abort(); revision++ })
  async function exportRows(all = false) {
    const values = queryValues(all ? {} : params.value)
    const rows = []
    for (let page = 0; ; page++) {
      const result = validate(await request({ url: endpoint, params: { ...values, page, size: 100, sort: sortProp.value, order: sortOrder.value } }))
      if (result.totalElements > 20000) throw new Error(currentLang.value === 'en' ? 'Export is limited to 20,000 rows. Please narrow the filters.' : '单次导出最多 20,000 条，请缩小筛选范围。')
      rows.push(...result.content)
      if (result.last || rows.length >= result.totalElements) return rows
      if (!result.content.length) throw new Error(message())
    }
  }
  async function exportResult(type, writeRows) {
    if (exporting.value) return
    exporting.value = true
    try { await writeRows(await exportRows(type === 'all')) }
    catch(error) { ElMessage.error(error.message || message()) }
    finally { exporting.value = false }
  }
  return { data, loading, totalElements, currentPage, pageSize, sortProp, sortOrder, loadData, exporting, exportResult }
}
