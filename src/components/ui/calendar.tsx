"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-8 aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-8 w-full px-8",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-8 gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "h-8 flex items-center justify-center gap-1.5 px-3",
          defaultClassNames.caption_label
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "h-8 w-8 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          defaultClassNames.day
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
          defaultClassNames.day_button
        ),
        day_range_start: cn("day-range-start", defaultClassNames.day_range_start),
        day_range_end: cn("day-range-end", defaultClassNames.day_range_end),
        day_selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          defaultClassNames.day_selected
        ),
        day_today: cn("bg-accent text-accent-foreground", defaultClassNames.day_today),
        day_outside: cn(
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          defaultClassNames.day_outside
        ),
        day_disabled: cn("text-muted-foreground opacity-50", defaultClassNames.day_disabled),
        day_range_middle: cn(
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
          defaultClassNames.day_range_middle
        ),
        day_hidden: cn("invisible", defaultClassNames.day_hidden),
        ...classNames,
      }}
      components={{
        DayButton: ({ className, children, ...props }) => (
          <DayButton
            className={cn(
              buttonVariants({ variant: buttonVariant }),
              "h-8 w-8 p-0 font-normal focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-accent hover:text-accent-foreground",
              className
            )}
            {...props}
          >
            {children}
          </DayButton>
        ),
        PreviousMonthButton: ({ className, children, ...props }) => (
          <Button
            variant={buttonVariant}
            size="icon"
            className={cn("h-8 w-8 aria-disabled:opacity-50", className)}
            {...props}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        ),
        NextMonthButton: ({ className, children, ...props }) => (
          <Button
            variant={buttonVariant}
            size="icon"
            className={cn("h-8 w-8 aria-disabled:opacity-50", className)}
            {...props}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        ),
        Dropdown: ({ className, children, ...props }) => (
          <select
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            {...props}
          >
            {children}
          </select>
        ),
        DropdownOption: ({ className, children, ...props }) => (
          <option className={cn("text-sm", className)} {...props}>
            {children}
          </option>
        ),
        ...components,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }