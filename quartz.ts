import { loadQuartzConfig, loadQuartzLayout } from "./quartz/plugins/loader/config-loader"
import Calendar from "./quartz/components/Calendar"
import ConditionalRender from "./quartz/components/ConditionalRender"

const config = await loadQuartzConfig()
export default config

// Core-local calendar renderer. Shows a month grid on notes flagged
// `is_calendar: true` in frontmatter (e.g. calendar/Calendar.md in the vault).
const baseLayout = await loadQuartzLayout()
const calendarComponent = ConditionalRender({
  component: Calendar,
  condition: (props) => props.fileData.frontmatter?.is_calendar === true,
})

const byPageType = Object.fromEntries(
  Object.entries(baseLayout.byPageType).map(([pageType, layout]) => [
    pageType,
    {
      ...layout,
      beforeBody: [...(layout.beforeBody ?? []), calendarComponent],
    },
  ]),
)

export const layout = await loadQuartzLayout({
  defaults: {
    ...baseLayout.defaults,
    beforeBody: [...(baseLayout.defaults.beforeBody ?? []), calendarComponent],
  },
  byPageType,
})
