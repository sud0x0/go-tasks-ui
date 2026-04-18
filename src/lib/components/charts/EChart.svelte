<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { echarts } from '../../utils/echarts'
  import type { EChartsOption } from 'echarts'

  interface Props {
    option: EChartsOption
    height?: string
  }

  let { option, height = '300px' }: Props = $props()

  let container: HTMLDivElement
  let chart: ReturnType<typeof echarts.init> | null = null

  onMount(() => {
    chart = echarts.init(container)
    chart.setOption(option)

    const observer = new ResizeObserver(() => chart?.resize())
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  })

  $effect(() => {
    if (chart) {
      chart.setOption(option, true)
    }
  })

  onDestroy(() => {
    chart?.dispose()
  })
</script>

<div bind:this={container} style="width: 100%; height: {height};"></div>
