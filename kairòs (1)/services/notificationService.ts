
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
        console.warn("Questo browser non supporta le notifiche desktop.");
        return false;
    }

    if (Notification.permission === "granted") {
        return true;
    }

    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }

    return false;
};

export const sendNotification = (title: string, body: string) => {
    if (Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: '/icon.png', // Optional: requires an actual file
            silent: false
        });
    }
};
