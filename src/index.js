const { host, port, blacklistedWords, admins } = require("../config.json");
const { Signale } = require("signale");
const ws = require("ws");
const Session = require("./struct/Session");

const sessions = [];
const logger = new Signale();

const BLACKLISTED_WORD_REGEX = new RegExp(blacklistedWords.join("|"), "gi");

const server = new ws.Server({ port, host }, () =>
  logger.star("Started server.")
);

server.on("connection", (socket, req) => {
  socket.on("message", (msg) => {
    const ip = req.socket.remoteAddress;
    if (!ip || !ip.length) {
      socket.close(1006);
      return;
    }

    logger.info(`Connection established from ${ip}`);

    let json;
    try {
      json = JSON.parse(msg.toString());
    } catch {
      socket.close(4001, "Invalid JSON request.");
      return;
    }

    const session = sessions.find((s) => s.ip === ip);
    if (!("op" in json) || isNaN(parseInt(json.op)) || !session) {
      // if there is a session id put inside the request, they are reconnecting.
      if ("session_id" in json) {
        const session = sessions.find((s) => s.session_id === json.session_id);
        if (!session) {
          socket.close(4010, "Invalid session id provided.");
          return;
        }

        if (session.ip !== ip) {
          socket.close(
            4009,
            "Attempted to reconnect session on a different IP."
          );
          sessions.remove(session); // remove session so it cannot be reconnected into again
          return;
        }

        // re-establish or something idfk
        return;
      }

      if (!("username" in json)) {
        socket.close(4001, "Invalid JSON request.");
        return;
      }

      const session = new Session(ip, json.username);
      sessions.push(session);

      socket.send(
        JSON.stringify({
          op: 1337,
          session_id: session.session_id,
        })
      );

      logger.info(`User ${json.username} has successfully joined the chat.`);

      sendToAllClients("SYSTEM", `${json.username} has joined the chat.`);
    } else {
      if (!session) {
        socket.close(69420, "What the fuck? Your session doesn't exist..");
        return;
      }

      const opCode = parseInt(json.op);

      switch (opCode) {
        // 0 = message
        case 0: {
          if (!("message" in json)) {
            socket.send(
              JSON.stringify({ op: 1, message: "No message specified." })
            );
            return;
          }

          const message = json.message.substring(0, 128);
          if (
            BLACKLISTED_WORD_REGEX.test(message) &&
            !admins.includes(session.username)
          ) {
            // todo: log what blacklisted words the user said.
            socket.send(JSON.stringify({ op: 0, message: "Access denied." }));
            return;
          }

          sendToAllClients(session.name, message);
          break;
        }

        // 69420 = admin action
        case 69420: {
          if (!admins.includes(session.name)) {
            socket.send(JSON.stringify({ op: 0, message: "Access denied." }));
            return;
          }

          // here, we'll check the "action" parameter in the JSON object to see whats they wanna do
          break;
        }
      }
    }
  });

  socket.on("close", (code, reason) => {
    const ip = req.socket.remoteAddress;
    const session = sessions.find((s) => s.ip === ip);

    logger.note(
      `Disconnected ${ip} for ${reason} (c ${code}, valid ${!!session})`
    );

    if (session) {
      // code 6101118 = force disconnect from admin/other force
      if (code === 6101118) {
        sendToAllClients(
          "SYSTEM",
          `${session.name} has been forcefully removed from the chat.`
        );
      } else {
        sendToAllClients("SYSTEM", `${session.name} has left the chat.`);
      }
    }
  });
});

const sendToAllClients = (username, message) => {
  logger.info(`(${username}): ${message}`);
  server.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        username,
        message,
      })
    );
  });
};
