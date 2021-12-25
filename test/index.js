const ws = require("ws");

const socket = new ws("ws://localhost:1337/");
socket.on("open", () => {
  socket.send(JSON.stringify({ username: "Aestheticall" }));
});

socket.on("message", (msg) => {
  const json = JSON.parse(msg.toString());
  if ("op" in json) {
    const op = parseInt(json.op);
    if (op === 1337) {
      socket.send(
        JSON.stringify({ op: 0, message: "hello world! I'm aestheticall!!" })
      );
    }
  }

  console.log(msg.toString());
});

socket.on("close", (code, reason) =>
  console.log(`Code: ${code}, reason: ${reason}`)
);
