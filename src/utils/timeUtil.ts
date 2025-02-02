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

export { getCurrentTime, getCurrentEpochTimestamp, getCurrentDateTime }