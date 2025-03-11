const express = require("express");
const WhatsappAnlusoft = require('./WhatsappAnlusoftv2');
const { exec } = require('child_process');
const puppeteer = require("puppeteer");
const app = express();
const puerto = 4005;
//const tarea_iniciar = `cd /home/anlusoft/whatsapp/ && pm2 restart src/indexV11_${puerto}.js`;

app.set("port", process.env.PORT || puerto);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb',extended: true}));
app.use('/static', express.static(__dirname + '/public'));

app.listen(app.get("port"), () =>
    console.log(`app running on port ${app.get("port")}`)
);

console.log("EMPEZO START");

let browserDefault;
let clientDefault;

app.post("/apinooficial", async (req, res) => {
    let respuesta = { status: "-1", message: "No inicializado", accion: ""  };
    const body = req.body;
    const rutaAbsolutaKeyPath = "/home/anlusoft/whatsapp/tmp";
    const url_notificacion = body.app_script || body.url_notificacion || null; // Initialize url_notificacion here
    const log = (operation, data = {}) => console.log(`${new Date().toISOString()} [${operation}]: ${JSON.stringify(data)}`);
    let responseSent = false; // Track if response has been sent

    log("apinooficial:start", { body });

    try {
        switch (body.op) {
          
            
            case "iniciarqr": 

                if (clientDefault) {
                    console.log(" Cerrando sesion anterior de WhatsApp...");
                    await clientDefault.destroy(); // Cierra la sesi�n de WhatsApp
                    clientDefault = null; // Resetea la variable
                }
        
                // Verificar si Puppeteer ya estaba abierto y cerrarlo
                if (browserDefault) {
                    console.log(" Cerrando instancia previa de Puppeteer...");
                    await browserDefault.close(); // Cierra el navegador
                    browserDefault = null;
                }


                body.graba_session = body.fechahora ? `LOC${body.fechahora}` : body.graba_session;
                const launchOptions = body.autobrowserwindows 
                    ? { headless: false, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } 
                    : { args: ['--no-sandbox', '--disable-setuid-sandbox', '--unhandled-rejections=strict'], headless: true };

                browserDefault = await puppeteer.launch(launchOptions);

                log("iniciarqr:browserLaunched");
                clientDefault = await WhatsappAnlusoft.inicializar(browserDefault, body, rutaAbsolutaKeyPath, url_notificacion, body.graba_session);
                respuesta = clientDefault ? { status: "0", message: "Se esta iniciando en el Web Whatsapp, espero de 10 a 40 seg a que se genere el QR y luego escanealo", accion: "reiniciarbot" } : { status: "1", message: "No se puede generar iniciar el Web Whatsapp", accion: "reiniciarbot" };
  
                break;
                

            case "registermessage":
            case "sendmessagewk": {
                const resultado = await handleTasks(body, url_notificacion, res);
                if (!responseSent) {
                    respuesta = resultado;
                }
                break;
            }
        }
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        respuesta = { status: "-1", message: `ERROR: ${errorMsg}` };
        log("apinooficial:error", { error: errorMsg });
    } finally {
        if (!responseSent) {
            res.send(respuesta);
            log("apinooficial:end", { respuesta });
        }
    }
});

async function handleTasks(body, url_notificacion, res) {
    const bot = `${body.bot || ''}: `;
    const intervalo_mensaje = parseInt((body.intervalo_mensaje || 1)) * 1000;
    const cantidad_a_notificar = body.cantidad_a_notificar || 150;
    let respuesta = { status: "0", message: "" };

    if (!clientDefault) {
        return { status: "1", message: "Client no inicializado" };
    }

    if (body.mensajes?.length) {
        respuesta = await WhatsappAnlusoft.notificar(clientDefault, body.mensajes, bot, intervalo_mensaje, url_notificacion, cantidad_a_notificar, body.config);
    } else if (body.validar_numero?.length) {
        respuesta = await WhatsappAnlusoft.validar_whatsapp(clientDefault, body.validar_numero, bot, 200, url_notificacion, cantidad_a_notificar);
    } else if (body.grupos?.length) {
        respuesta = await WhatsappAnlusoft.grupos(clientDefault, bot, url_notificacion);
    } else if (body.contactos?.length) {
        respuesta = await WhatsappAnlusoft.contactos(clientDefault, bot, url_notificacion);
    } else if (body.grupocontactos?.length) {
        respuesta = await WhatsappAnlusoft.grupocontactos(clientDefault, bot,body.grupocontactos, url_notificacion);
    }else if (body.conversacion?.length) {
        const conversacionResponse = await new Promise(resolve => {
            WhatsappAnlusoft.iniciar_conversacion(clientDefault, body, url_notificacion, bot, body.conversacion, intervalo_mensaje);
            setTimeout(() => resolve({ status: "0", message: "Se activo el BOT de la session de whatsapp" }), 15000);
        });
        res.send(conversacionResponse);
        return;
    } else if (body.conversacion_bot_local?.length) {
        const localBotResponse = await new Promise(resolve => {
            WhatsappAnlusoft.iniciar_bot_local(clientDefault, body, bot, body.conversacion_bot_local, intervalo_mensaje);
            setTimeout(() => resolve({ status: "0", message: "Se activo el BOT LOCAL de la session de whatsapp" }), 5000);
        });
        res.send(localBotResponse);
        return;
    } else if (body.conversacion_bot?.length) {
        const botResponse = await new Promise(resolve => {
            WhatsappAnlusoft.iniciar_bot(clientDefault, body, url_notificacion, bot, body.conversacion_bot, intervalo_mensaje);
            setTimeout(() => resolve({ status: "0", message: "Se activo el BOT de la session de whatsapp" }), 15000);
        });
        res.send(botResponse);
        return;
    }

    return respuesta;
}