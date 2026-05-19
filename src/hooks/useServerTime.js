import { useState, useEffect } from 'react';

// Shared global variables to maintain the offset across multiple components and remounts
let globalTimeOffset = 0;
let hasFetchedOffset = false;

export default function useServerTime(intervalMs = 5000) {
    const [currentTime, setCurrentTime] = useState(() => Date.now() + globalTimeOffset);

    useEffect(() => {
        // Fetch server time offset only once per session
        if (!hasFetchedOffset) {
            hasFetchedOffset = true;
            // Fetch headers from our own app, the CDN will add a reliable "Date" header
            fetch(window.location.href, { method: 'HEAD', cache: 'no-store' })
                .then(res => {
                    const dateStr = res.headers.get('Date');
                    if (dateStr) {
                        const serverTime = new Date(dateStr).getTime();
                        globalTimeOffset = serverTime - Date.now();
                        setCurrentTime(Date.now() + globalTimeOffset);
                    }
                })
                .catch(err => {
                    console.warn("Failed to fetch server time offset, using local time", err);
                });
        }

        const timer = setInterval(() => {
            setCurrentTime(Date.now() + globalTimeOffset);
        }, intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs]);

    return currentTime;
}
