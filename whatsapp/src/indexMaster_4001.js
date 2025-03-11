const express = require("express");
const WhatsappAnlusoft = require('./WhatsappAnlusoftv2');
const { spawn } = require("child_process");

const app = express();
const puerto = 4001;

app.set("port", process.env.PORT || puerto);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use('/static', express.static(__dirname + '/public'));

app.listen(app.get("port"), () =>
    console.log(`🚀 Servidor corriendo en el puerto ${app.get("port")}`)
);

console.log("✅ Servidor Iniciado - `indexMaster_4001.js`");

// 🔒 Lock para evitar múltiples reinicios simultáneos
let lock = false;

/**
 * 📌 Elimina cualquier proceso en PM2 antes de reiniciarlo
 * @param {string} processName - Nombre del proceso en PM2 (ej: indexV11_4005)
 * @param {function} callback - Función de respuesta
 */
function deletePM2Process(processName, callback) {
    console.log(`🛑 Eliminando procesos duplicados en PM2: ${processName} y ${processName}.js ...`);

    const deleteCommand = `pm2 delete ${processName} || echo "No se encontró en PM2"; pm2 delete ${processName}.js || echo "No se encontró en PM2"`;
    const process = spawn("sh", ["-c", deleteCommand]);

    process.stdout.on("data", (data) => console.log(`🔹 stdout: ${data}`));
    process.stderr.on("data", (data) => console.error(`⚠️ stderr: ${data}`));

    process.on("close", (code) => {
        console.log(`✅ Eliminación de procesos en PM2 finalizada.`);
        callback(null, `✅ Eliminación de procesos en PM2 finalizada.`);
    });

    process.on("error", (err) => {
        console.error(`❌ Error al ejecutar el comando: ${err.message}`);
        callback(err.message);
    });
}

/**
 * 📌 Matar procesos huérfanos antes de reiniciar
 * @param {string} filePath - Ruta del archivo .js
 * @param {function} callback - Función de respuesta
 */
function killProcess(filePath, callback) {
    console.log(`🛑 Matando procesos huérfanos de: ${filePath}...`);

    const killCommand = `pgrep -f ${filePath} | xargs -r kill -9 || echo "No se encontraron procesos huérfanos"`;
    const process = spawn("sh", ["-c", killCommand]);

    process.stdout.on("data", (data) => console.log(`🔹 stdout: ${data}`));
    process.stderr.on("data", (data) => console.error(`⚠️ stderr: ${data}`));

    process.on("close", (code) => {
        console.log(`✅ Procesos huérfanos eliminados.`);
        callback(null, `✅ Procesos huérfanos eliminados.`);
    });

    process.on("error", (err) => {
        console.error(`❌ Error al matar procesos huérfanos: ${err.message}`);
        callback(err.message);
    });
}

// 📌 Endpoint principal
app.post("/apinooficial", async (req, res) => {
    let respuesta = { status: "-1", message: "No inicializado", accion: "" };
    const body = req.body;
    const rutaAbsolutaKeyPath = "/home/anlusoft/whatsapp/tmp";
    const url_notificacion = body.app_script || body.url_notificacion || null;
    const log = (operation, data = {}) => console.log(`${new Date().toISOString()} [${operation}]: ${JSON.stringify(data)}`);

    log("apinooficial:start", { body });

    try {
        switch (body.op) {
            case "reiniciarbot":
                if (lock) return res.send({ status: "1", message: "🔄 Reinicio en curso, intenta más tarde", accion: "reiniciarbot" });
                lock = true;

                let processName = `indexV11_${body.puerto}`;
                let filePath = `/home/anlusoft/whatsapp/src/${processName}.js`;

                console.log(`🔄 Iniciando reinicio de: ${processName}`);

                // 📌 Primero eliminar de PM2 si existe
                deletePM2Process(processName, (err, result) => {
                    console.log(result);

                    // 📌 Matar cualquier proceso huérfano del archivo
                    killProcess(filePath, (err, result) => {
                        console.log(result);

                        // 📌 Iniciar el proceso con el nombre CORRECTO en PM2
                        const pm2Command = `(cd /home/anlusoft/whatsapp/ && pm2 start src/${processName}.js --name ${processName})`;

                        const pm2Process = spawn("sh", ["-c", pm2Command]);

                        pm2Process.stdout.on("data", (data) => console.log(`🔹 stdout (PM2): ${data}`));
                        pm2Process.stderr.on("data", (data) => console.error(`⚠️ stderr (PM2): ${data}`));

                        pm2Process.on("close", (code) => {
                            lock = false;
                            if (code === 0) {
                                console.log(`✅ PM2 ejecutado correctamente para ${processName}`);
                                return res.send({ status: "0", message: `✅ Se reinició correctamente ${processName}`, accion: "reiniciarbot" });
                            } else {
                                console.error(`❌ Error en PM2 para ${processName}`);
                                return res.send({ status: "1", message: `❌ Error en PM2 para ${processName}`, accion: "reiniciarbot" });
                            }
                        });

                        pm2Process.on("error", (err) => {
                            lock = false;
                            console.error(`❌ Error en PM2: ${err.message}`);
                            return res.send({ status: "1", message: `❌ Error en PM2: ${err.message}`, accion: "reiniciarbot" });
                        });
                    });
                });

                break;

            default:
                res.send({ status: "1", message: "❌ Operación no válida", accion: body.op });
        }
    } catch (error) {
        res.send({ status: "1", message: `❌ Error inesperado: ${error.message}`, accion: body.op });
        lock = false;
    }
});

