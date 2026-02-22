export const formatDate = (date: Date) =>
    date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        weekday: "long",
        year: "numeric",
    });

export const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        hour12: true,
        minute: "2-digit",
    });
