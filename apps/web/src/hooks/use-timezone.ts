import { useEffect, useState } from "react"

export function useTimezone() {
    const [timezone, setTimezone] = useState<string>("")
    const [offset, setOffset] = useState<number>(0)

    useEffect(() => {
        // Get browser timezone using Intl API
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        setTimezone(timezone)

        // Get UTC offset in minutes
        const now = new Date()
        const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }))
        const localDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }))
        const offset = (localDate.getTime() - utcDate.getTime()) / (1000 * 60)
        setOffset(offset)
    }, [])

    return {
        timezone,
        offset, // offset in minutes
        offsetHours: Math.round(offset / 60),
    }
}
