import { FullSlug, resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentProps } from "./types"

type CalendarEvent = {
  date: Date
  title: string
  slug: FullSlug
  status?: string
  type?: string
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Read an ISO `YYYY-MM-DD` frontmatter date (extra time suffixes are ignored). */
function parseIsoDate(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return undefined
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Renders every note with an ISO `date` in frontmatter as a month calendar.
 * Enable it on a note by setting `is_calendar: true` in its frontmatter.
 */
const Calendar: QuartzComponent = ({ cfg, fileData, allFiles }: QuartzComponentProps) => {
  const events: CalendarEvent[] = []

  for (const file of allFiles) {
    const frontmatter = (file.frontmatter ?? {}) as Record<string, unknown>
    const date = parseIsoDate(frontmatter.date)
    if (!date || !file.slug) continue

    events.push({
      date,
      title: typeof frontmatter.title === "string" ? frontmatter.title : String(file.slug),
      slug: file.slug as FullSlug,
      status: typeof frontmatter.status === "string" ? frontmatter.status : undefined,
      type: typeof frontmatter.type === "string" ? frontmatter.type : undefined,
    })
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime() || a.title.localeCompare(b.title))

  if (events.length === 0) {
    return <p class="calendar-empty">No dated notes to show yet.</p>
  }

  const months = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const key = `${event.date.getUTCFullYear()}-${String(event.date.getUTCMonth() + 1).padStart(2, "0")}`
    const bucket = months.get(key) ?? []
    bucket.push(event)
    months.set(key, bucket)
  }

  const locale = cfg.locale ?? "en-US"
  const now = new Date()

  return (
    <div class="calendar-renderer">
      {[...months.entries()].map(([key, monthEvents]) => {
        const year = Number(key.slice(0, 4))
        const month = Number(key.slice(5, 7)) - 1
        const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

        const cells: (number | null)[] = Array(firstWeekday).fill(null)
        for (let day = 1; day <= daysInMonth; day++) cells.push(day)
        while (cells.length % 7 !== 0) cells.push(null)

        const byDay = new Map<number, CalendarEvent[]>()
        for (const event of monthEvents) {
          const day = event.date.getUTCDate()
          const bucket = byDay.get(day) ?? []
          bucket.push(event)
          byDay.set(day, bucket)
        }

        const label = new Intl.DateTimeFormat(locale, {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.UTC(year, month, 1)))

        return (
          <section class="calendar-month" id={`calendar-${key}`}>
            <h2>{label}</h2>
            <div class="calendar-grid">
              {WEEKDAYS.map((weekday) => (
                <div class="calendar-weekday">{weekday}</div>
              ))}
              {cells.map((day) => {
                if (day === null) return <div class="calendar-cell calendar-blank"></div>

                const dayEvents = byDay.get(day) ?? []
                const isToday =
                  now.getUTCFullYear() === year &&
                  now.getUTCMonth() === month &&
                  now.getUTCDate() === day

                return (
                  <div
                    class={`calendar-cell${isToday ? " calendar-today" : ""}${dayEvents.length > 0 ? " calendar-has-events" : ""}`}
                  >
                    <span class="calendar-daynum">{day}</span>
                    {dayEvents.map((event) => (
                      <a
                        class="calendar-event"
                        href={resolveRelative(fileData.slug!, event.slug)}
                        title={event.title}
                      >
                        {event.title}
                      </a>
                    ))}
                  </div>
                )
              })}
            </div>
            <ul class="calendar-month-list">
              {monthEvents.map((event) => (
                <li>
                  <time datetime={event.date.toISOString().slice(0, 10)}>
                    {event.date.toISOString().slice(0, 10)}
                  </time>
                  <a href={resolveRelative(fileData.slug!, event.slug)}>{event.title}</a>
                  {event.status && <span class="calendar-status">{event.status}</span>}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

Calendar.css = `
.calendar-renderer {
  margin: 1.5rem 0;
}
.calendar-month {
  margin-bottom: 2.5rem;
}
.calendar-month h2 {
  margin-bottom: 0.5rem;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
  border: 1px solid var(--lightgray);
  border-radius: 4px;
  overflow: hidden;
}
.calendar-weekday {
  padding: 0.35rem;
  text-align: center;
  font-weight: 600;
  background: var(--lightgray);
  font-size: 0.8rem;
}
.calendar-cell {
  min-height: 5rem;
  padding: 0.3rem;
  border-top: 1px solid var(--lightgray);
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}
.calendar-blank {
  background: rgba(127, 127, 127, 0.05);
}
.calendar-today {
  outline: 2px solid var(--secondary);
  outline-offset: -2px;
}
.calendar-has-events {
  background: var(--highlight, rgba(143, 159, 169, 0.15));
}
.calendar-daynum {
  display: block;
  font-weight: 600;
  margin-bottom: 0.2rem;
}
.calendar-event {
  display: block;
  margin: 0.1rem 0;
  font-size: 0.75rem;
  line-height: 1.2;
}
.calendar-month-list {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
}
.calendar-month-list li {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  margin-bottom: 0.25rem;
}
.calendar-month-list time {
  color: var(--darkgray);
  font-variant-numeric: tabular-nums;
}
.calendar-status {
  margin-left: auto;
  color: var(--darkgray);
  font-size: 0.8rem;
  text-transform: capitalize;
}
.calendar-empty {
  color: var(--darkgray);
}
@media (max-width: 800px) {
  .calendar-cell {
    min-height: 3.5rem;
    font-size: 0.7rem;
  }
}
`

export default Calendar
