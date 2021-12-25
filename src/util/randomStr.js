module.exports = () => {
    return Math.random().toString(16).toString().slice(2) + "_" + Date.now().toString();
}