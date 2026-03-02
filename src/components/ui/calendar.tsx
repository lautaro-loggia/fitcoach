import * as React from "react"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            weekStartsOn={1}
            navLayout="around"
            className={cn("p-3", className)}
            locale={es}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4 w-full relative",
                month_caption: "flex h-9 items-center justify-center",
                caption_label: "text-sm font-medium capitalize",
                nav: "flex items-center",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "absolute left-1 top-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 z-10"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "absolute right-1 top-1 h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 z-10"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7 gap-1 mb-1",
                weekday: "text-muted-foreground h-8 w-8 rounded-md text-xs font-medium capitalize flex items-center justify-center",
                weeks: "grid gap-1",
                week: "grid grid-cols-7 gap-1 w-full",
                day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 flex justify-center items-center",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md transition-none"
                ),
                range_end: "day-range-end",
                selected:
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                today: "bg-accent/50 text-accent-foreground border border-primary/20",
                outside:
                    "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                disabled: "text-muted-foreground opacity-50",
                range_middle:
                    "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            formatters={{
                formatWeekdayName: (date) => {
                    const weekday = format(date, "EEEEEE", { locale: es })
                    return weekday.charAt(0).toUpperCase() + weekday.slice(1)
                }
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
