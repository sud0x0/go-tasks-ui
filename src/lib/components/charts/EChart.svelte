<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { EChartsOption } from 'echarts'
  import type { EChartsType } from 'echarts/core'

  interface Props {
    option: EChartsOption
    height?: string
  }

  let { option, height = '300px' }: Props = $props()

  let container: HTMLDivElement
  let chart: EChartsType | null = null
  let observer: ResizeObserver | null = null

  // Dynamic import keeps echarts out of the main bundle — Vite emits a
  // separate chunk that only loads the first time an EChart mounts (i.e. the
  // first visit to the Charts route). echarts is ~600 kB before gzip, so this
  // moves the bulk of the JS payload off the initial paint.
  onMount(async () => {
    const { echarts } = await import('../../utils/echarts')
    const instance = echarts.init(container)
    instance.setOption(option)
    observer = new ResizeObserver(() => instance.resize())
    observer.observe(container)
    chart = instance
  })

  $effect(() => {
    if (chart) {
      chart.setOption(option, true)
    }
  })

  onDestroy(() => {
    observer?.disconnect()
    chart?.dispose()
  })
</script>

<div bind:this={container} style="width: 100%; height: {height};"></div>
