import cluster from "node:cluster";
import os from "node:os";
import { app, port } from "./app";

const total_cores = os.cpus().length;

if (cluster.isPrimary) {
    for (let i = 0; i < total_cores; i++) {
        cluster.fork();
    }
    cluster.on("exit", () => {
        cluster.fork();
    });
} else {
    app.listen(port, () => {});
}
