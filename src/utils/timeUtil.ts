const getCurrentTime = () => {
    const now = Date.now();
    return now;
}
const getCurrentDateTime = () => {
    const now = new Date();
    return now;
}

const getCurrentEpochTimestamp = (): number => {
    return +getCurrentTime()
}

const getCurrentEpochTimestampInSeconds = (): number => {
    const now = Date.now();
    return Math.floor(now / 1000);
};

function getCurrentDateAsYYYYMMDD(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${year}${month}${day}`;
}

function getCurrentDateAsYYYYMMDDHH(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hour = String(now.getHours()).padStart(2, '0');
    return `${year}${month}${day}${hour}`;
}

export { getCurrentTime, getCurrentEpochTimestamp, getCurrentDateTime, getCurrentEpochTimestampInSeconds, getCurrentDateAsYYYYMMDD, getCurrentDateAsYYYYMMDDHH }