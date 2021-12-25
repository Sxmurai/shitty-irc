const randomStr = require("../util/randomStr");

module.exports = class Session {
    constructor(ip, name) {
        this.ip = ip;
        this.name = name;
        this.session_id = randomStr();
    }
}