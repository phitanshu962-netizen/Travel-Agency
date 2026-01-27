"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType["AUTH"] = "AUTH";
    MessageType["MESSAGE"] = "MESSAGE";
    MessageType["ACK"] = "ACK";
    MessageType["HISTORY_REQUEST"] = "HISTORY_REQUEST";
    MessageType["HISTORY_RESPONSE"] = "HISTORY_RESPONSE";
    MessageType["SYNC_REQUEST"] = "SYNC_REQUEST";
    MessageType["SYNC_RESPONSE"] = "SYNC_RESPONSE";
    MessageType["PING"] = "PING";
    MessageType["PONG"] = "PONG";
    MessageType["ERROR"] = "ERROR";
})(MessageType || (exports.MessageType = MessageType = {}));
