const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ----------------------
// ROBOT DATABASE (SIMULATED)
// ----------------------
let robots = [
  { id: "R-1", x: 10, y: 20, battery: 100, status: "idle", task: null },
  { id: "R-2", x: 50, y: 80, battery: 90, status: "idle", task: null },
  { id: "R-3", x: 80, y: 30, battery: 70, status: "idle", task: null }
];

// ----------------------
// TASK SYSTEM
// ----------------------
let tasks = [];

function assignTask(robotId, task) {
  const robot = robots.find(r => r.id === robotId);
  if (robot) {
    robot.task = task;
    robot.status = "working";
  }
}

// ----------------------
// SIMULATION LOOP
// ----------------------
setInterval(() => {
  robots = robots.map(robot => {
    if (robot.status === "working") {
      robot.x += Math.random() * 5 - 2;
      robot.y += Math.random() * 5 - 2;
      robot.battery -= 0.5;

      if (robot.battery <= 10) {
        robot.status = "charging";
        robot.task = null;
      }
    }

    if (robot.status === "charging") {
      robot.battery += 1;
      if (robot.battery >= 100) {
        robot.status = "idle";
        robot.battery = 100;
      }
    }

    return robot;
  });

  io.emit("robotsUpdate", robots);
  io.emit("tasksUpdate", tasks);
}, 1000);

// ----------------------
// SOCKET CONNECTION
// ----------------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("robotsUpdate", robots);
  socket.emit("tasksUpdate", tasks);

  socket.on("createTask", (task) => {
    const newTask = {
      id: Date.now(),
      name: task.name,
      assigned: false
    };

    tasks.push(newTask);

    // auto-assign first idle robot
    const idleRobot = robots.find(r => r.status === "idle");
    if (idleRobot) {
      idleRobot.task = newTask.name;
      idleRobot.status = "working";
      newTask.assigned = true;
    }

    io.emit("tasksUpdate", tasks);
    io.emit("robotsUpdate", robots);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

server.listen(3001, () => {
  console.log("🚀 Backend running on http://localhost:3001");
});
