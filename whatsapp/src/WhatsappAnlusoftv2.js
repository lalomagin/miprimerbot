require('dotenv').config();

const { Client, List, Buttons, LocalAuth, MessageMedia, Location } = require('whatsapp-web.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const AdmZip = require("adm-zip");
const qrcode = require("qrcode-terminal");

const getStandardResponsePost = async (status, message, data) => ({
    status: `${status}`,
    message,
    data
});

const currentTimeLog = (funcName, logInfo, data = {}) => {
    const now = new Date();
    return `${now.toISOString()} [${funcName}] ${logInfo}: ${JSON.stringify(data)}`;
};

const obtenerevento = async (numero, mensaje, filtro, configuracion) => {
    console.log(currentTimeLog("obtenerevento", "Entrada", { numero, mensaje, filtro }));
    try {
        let evento = configuracion.find(item => item.entrada.toUpperCase().split(";").includes(mensaje.toUpperCase())) || 
                     configuracion.find(item => item.evento === (filtro.length && filtro[filtro.length - 1].retornar) || "Error");
        const eventoIniciador = configuracion.find(item => item.evento === "Start");
        
        if (evento.evento === "Error" && eventoIniciador?.entrada.includes("%%%") && 
           (filtro.length === 0 || filtro.length === 1 && filtro[0].evento.includes("Close"))) {
            evento = eventoIniciador;
        }
        
        const result = { status: "0", tipo: "mensaje", numero, mensaje, evento: evento.evento, retornar: evento.retornar, mensaje_salida: evento.salida, entrenamiento: evento.entrenamiento, token: evento.token, cierreentrenamiento: evento.cierreentrenamiento };
        console.log(currentTimeLog("obtenerevento", "Salida", result));
        return result;
    } catch (e) {
        const errorResult = { status: "-1", message: e.toString() };
        console.log(currentTimeLog("obtenerevento", "Error", errorResult));
        return errorResult;
    }
};

const eventNotificationGPT = async (items, conversations, training, token) => {
    console.log(currentTimeLog("eventNotificationGPT", "Entrada", { items, conversations }));
    try {
        const model = "gpt-4o"; // Usar constante para la configuración del modelo
        const history = [{ "role": "system", "content": training }];
        conversations.forEach(conv => {
            if (conv.mensaje_entrada) history.push({ "role": "user", "content": conv.mensaje_entrada });
            if (conv.mensaje_salida) history.push({ "role": "assistant", "content": conv.mensaje_salida });
        });
        items.forEach(item => history.push({ "role": item.role, "content": item.content }));
        
        const payload = { messages: history, model, temperature: 0, max_tokens: 2048, presence_penalty: 0, frequency_penalty: 0, top_p: 1, stop: "" };
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: 'https://api.openai.com/v1/chat/completions',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(payload)
        };
        
        const response = await axios.request(config);
        const mensaje_chat = response.data.choices[0]?.message.content.trim() || "Ups no responde Chat GPT";
        
        const result = { status: "0", message: mensaje_chat };
        console.log(currentTimeLog("eventNotificationGPT", "Salida", result));
        return result;
    } catch (e) {
        const errorResult = { status: '-1', message: e.toString() };
        console.log(currentTimeLog("eventNotificationGPT", "Error", errorResult));
        return errorResult;
    }
};

const enviarMensajeUnificado = async (client, mensaje, numero, datosUrl = [],msgenvio) => {
    console.log(currentTimeLog("enviarMensajeUnificado", "Entrada", { mensaje, numero }));
    let itemsNotificar;
    let adicionalNotificar = "";

    try {
        if (mensaje.tipo === 'mensaje' || mensaje.mensaje) {
            itemsNotificar = mensaje.mensaje || mensaje.mensaje_salida;
        } else if (mensaje.imagenbase64 || mensaje.tipo === 'imagenbase64') {
            itemsNotificar = new MessageMedia('image/png', mensaje.imagenbase64 || mensaje.mensaje_salida);
        } else if (mensaje.pdfbase64) {
            itemsNotificar = new MessageMedia('application/pdf', mensaje.pdfbase64, mensaje.pdfnombre || "pdf.pdf");
        } else if (mensaje.stickerbase64) {
            itemsNotificar = new MessageMedia('image/webp', mensaje.stickerbase64);
            adicionalNotificar = { sendMediaAsSticker: true };
        } else if (mensaje.tipo === 'url' || mensaje.url) {
            const urlToFetch = mensaje.url || mensaje.mensaje_salida;
            const nombreArchivo = path.basename(urlToFetch) || "archivo";
            const response = datosUrl.find(data => data.data.direccionurl === urlToFetch) || 
                await axios.get(urlToFetch, { responseType: 'arraybuffer' }).then(res => {
                    const tipo = res.headers['content-type'].split(";")[0];
                    const buffer = Buffer.from(res.data, 'binary').toString('base64');
                    return getStandardResponsePost(0, "OK", { base: buffer, type: tipo, nombrearchivo: nombreArchivo, direccionurl: urlToFetch });
                }).catch(err => {
                    console.error(err.message);
                    return { status: '-1' };
                });

            datosUrl.push(response);
            if (response.status === "0") {
                console.log("response.data.type"+response.data.type);
                itemsNotificar = new MessageMedia(response.data.type, response.data.base, response.data.nombrearchivo);
                if (response.data.type.includes("audio/mpeg") || response.data.type.includes("audio/ogg")) {
                    adicionalNotificar = { sendAudioAsVoice: true };
                }
            }
        } else if (mensaje.tipo === 'location') {
            const [latitud, longitud] = mensaje.mensaje_salida.split(",").map(x => x.trim());
            itemsNotificar = new Location(latitud, longitud, "Ubicacion");
        }

        if (itemsNotificar) {
            if(mensaje.responder){
                //console.log("msgenvio",msgenvio);
                if (adicionalNotificar) {
                    await msgenvio.reply(itemsNotificar, adicionalNotificar);
                } else {
                    await msgenvio.reply(itemsNotificar);
                }
            }else{
                var numero_final = numero;
                if(mensaje.numerobot){
                    numero_final=mensaje.numerobot.includes("@") ? mensaje.numerobot : `${mensaje.numerobot}@c.us`;
                }
                if (adicionalNotificar) {
                    await client.sendMessage(numero_final, itemsNotificar, adicionalNotificar);
                } else {
                    await client.sendMessage(numero_final, itemsNotificar);
                }
            }
            const result = { estado: "Enviado" };
            console.log(currentTimeLog("enviarMensajeUnificado", "Salida", result));
            return result;
        }
    } catch (error) {
        console.error(currentTimeLog("enviarMensajeUnificado", "Error enviando mensaje", { error: error.message }));
    }

    const errorResult = { estado: "Error" };
    console.log(currentTimeLog("enviarMensajeUnificado", "Error", errorResult));
    return errorResult;
};
const reenviarMensajes = async (client, data) => {
    try {
        if (data.reenviar && data.numeroreenviar) {
            const numero_reenviar = data.numeroreenviar.includes("@") ? data.numeroreenviar : `${data.numeroreenviar}@c.us`;
            await client.sendMessage(numero_reenviar, data.reenviar);
        }
        if (data.reenviar_2 && data.numeroreenviar_2) {
            const numero_reenviar_2 = data.numeroreenviar_2.includes("@") ? data.numeroreenviar_2 : `${data.numeroreenviar_2}@c.us`;
            await client.sendMessage(numero_reenviar_2, data.reenviar_2);
        }
    } catch (err) {
        console.error(currentTimeLog("reenviarMensajes", "Error reenviando mensaje", { error: err.message }));
    }
};

const WhatsappAnlusoft = {
    async cerrar(browser, client, body, ruta, url, bot) {
        console.log(currentTimeLog("cerrar", "Entrada", { body }));
        try {
            if (url) await axios.post(url, { op: "qr", qr: "SE DESCONECTA" }).catch(err => console.error(err.message));
            
            client && await client.destroy();
            browser && await (await browser).close();
            
            if (body.carga_session) {
                const sessionPath = path.resolve(ruta, body.carga_session.replace("session-", "").replace(".zip", ""));
                fs.rmSync(sessionPath, { recursive: true, force: true });
                !body.local && fs.rmSync(`${sessionPath}.zip`, { recursive: true, force: true });
            }
            
            if (body.graba_session) {
                const zip = new AdmZip();
                const sessionName = body.graba_session;
                const sessionPath = path.resolve(ruta, `session-${sessionName}`);
                
                if (fs.existsSync(sessionPath)) {
                    zip.addLocalFolder(sessionPath, `session-${sessionName}`);
                    const bufferZip = await new Promise((resolve, reject) => {
                        zip.toBuffer(buffer => resolve(buffer.toString('base64')), reject);
                    });
                    
                    if (!body.local) {
                        await axios.post(process.env.URL_FTP_BUCKET, { op: "ftp_archivo", archivo_name: `session-${sessionName}.zip`, archivo_type: "application/zip", archivo_base64: bufferZip }, { maxContentLength: Infinity, maxBodyLength: Infinity }).catch(err => console.error(err.message));
                    } else {
                        fs.writeFileSync(`${sessionPath}.zip`, bufferZip, 'base64');
                        fs.rmSync(sessionPath, { recursive: true, force: true });
                    }
                }
            }
            console.log(currentTimeLog("cerrar", "Salida", { status: "success" }));
        } catch (e) {
            console.log(currentTimeLog("cerrar", "Error", { message: e.toString() }));
        }
    },
    
    async iniciar_conversacion(client, body, url, bot, config, intervalo) {
        console.log(currentTimeLog("iniciar_conversacion", "Entrada", { body }));
        let conversaciones = body.historial_conversacion || [];
        config.forEach(item => item.salida.forEach(salida => {
            if (salida.type === "url") {
                axios.get(salida.mensaje, { responseType: 'arraybuffer' }).then(res => {
                    const buffer = Buffer.from(res.data, 'binary').toString('base64');
                    salida.nombrearchivo = path.basename(salida.mensaje);
                    salida.base = buffer;
                    salida.mimetype = res.headers['content-type'].split(";")[0];
                }).catch(err => console.error(err.message));
            }
        }));

        client.removeAllListeners('message');

        client.on('message', async msg => {
            try {
                if (msg.from.includes("@g.us") && !body.error_en_grupos) throw "CONVERSACION GRUPO";
                
                const msgContent = msg.body || (msg.type !== "chat" && "documento_send");
                if (!msgContent) throw "CONVERSACION VACIA";
                
                await new Promise(r => setTimeout(r, intervalo));
                
                const numero = msg.from.includes("@g.us") ? msg.author : msg.from;
                const evento = await obtenerevento(numero, msgContent, conversaciones.filter(c => c.numero === numero), config);
                
                if (evento.status === "0") {
                    if (evento.evento === "api_gpt" && !evento.mensaje_salida || evento.evento === "Start" && evento.retornar === "api_gpt") {
                        const salidaGPT = await eventNotificationGPT([{ role: "user", content: msgContent }], conversaciones.filter(c => c.numero === numero), evento.entrenamiento, evento.token);
                        evento.mensaje_salida = salidaGPT.message;
                    }
                    
                    client.sendMessage(numero, evento.mensaje_salida);
                    conversaciones.push(evento);
                    if (evento.evento.includes("Start")) conversaciones = conversaciones.filter(c => c.numero !== numero);
                }

            } catch (e) {
                console.log(currentTimeLog("iniciar_conversacion", "Error", { message: e.toString() }));
            }
        });

        console.log(currentTimeLog("iniciar_conversacion", "Salida", { conversaciones }));
    },

    async iniciar_bot_local(client, body, bot, config, intervalo) {
        console.log(currentTimeLog("iniciar_bot_local", "Entrada", { body }));

        client.removeAllListeners('message');

        const messageHandler = async msg => {
            try {
                if (msg.from.includes("@g.us") && !((body.error_en_grupos && (body.error_en_grupos === "%" || body.error_en_grupos === msg.from)))) throw "CONVERSACION GRUPO";

                const numero = msg.from.includes("@g.us") ? msg.author : msg.from;
                const msgContent = msg.body || (msg.type !== "chat" && "documento_send");
                if (!msgContent) throw "CONVERSACION VACIA";

                const filtro = [];
                const evento = await obtenerevento(numero, msgContent, filtro, config);

                if (evento.status === "0") {
                    if (evento.evento === "api_gpt" || evento.evento === "Start" && evento.retornar === "api_gpt") {
                        const salidaGPT = await eventNotificationGPT([{ role: "user", content: msgContent }], filtro, evento.entrenamiento, evento.token);
                        evento.mensaje_salida = salidaGPT.message;
                    }
                    await client.sendMessage(numero, evento.mensaje_salida);
                }
            } catch (err) {
                console.log(currentTimeLog("iniciar_bot_local", "Error", { message: err.toString() }));
            }
        };

        client.on('message', messageHandler);
        console.log(currentTimeLog("iniciar_bot_local", "Salida"));
    },

    async iniciar_bot(client, body, url_notificacion, bot, config, intervalo_mensaje) {
        console.log(currentTimeLog("iniciar_bot", "Entrada", { body }));
        client.removeAllListeners('message');
        // se noficar
        var url_= url_notificacion ;
        var id_api="";
        if((body.tipobot+"").includes("ASISTENTE") && process.env.URL_NOTIFICACION){
            url_=process.env.URL_NOTIFICACION;
            // se carga a memoria los datos del sheet            
            id_api=(url_notificacion+"").replace("https://script.google.com/macros/s/","").replace("/exec","");
            console.log(currentTimeLog("iniciar_bot", "API SEND SHEET", { request: {op: "cargarcache",ID:id_api,"bot":body} }));
            const response_end = await axios.post(url_, {op: "cargarcache",ID:id_api,"bot":body});
            console.log(currentTimeLog("iniciar_bot", "API SEND SHEET", { response: response_end.data }));
        }        

        const handleMessages = async (msg) => {
            try {
                console.log(currentTimeLog("iniciar_bot", "Message received", { from: msg.from }));
                if (msg.from.includes("@g.us")){
                    if(!body.error_en_grupos){
                        throw new Error("CONVERSACION GRUPO");
                    }else if(!((body.error_en_grupos+"")=="SI" || (body.error_en_grupos+"")=="%%%" ||
                    (body.error_en_grupos+"").includes(msg.from))){
                        throw new Error("CONVERSACION GRUPO");
                    }
                }
                let mensaje_recibido = msg.body || "";
                let documento_recibido = {};
                let existe_mensaje = Boolean(mensaje_recibido);

                if (msg.type === "document" || msg.type === "image" || msg.type === "ptt" || msg.type === "audio") {
                    const mediaDocument = await msg.downloadMedia();
                    documento_recibido = {
                        mimetype: mediaDocument.mimetype,
                        filename: mediaDocument.filename,
                        data: mediaDocument.data,
                        adicional: msg._data?.interactiveAnnotations
                    };
                    mensaje_recibido = "documento_send";
                    existe_mensaje = true;
                } else if (msg.type === "location") {
                    documento_recibido = {
                        latitud: msg.location.latitude,
                        longitud: msg.location.longitude
                    };
                    mensaje_recibido = "ubicacion_send";
                    existe_mensaje = true;
                }

                if (!existe_mensaje) {
                    throw new Error("CONVERSACION VACIO");
                }

                await new Promise(resolve => setTimeout(resolve, intervalo_mensaje));

                const numero_enviar = msg.from.includes("@g.us") ? msg.author : msg.from;
                const conversacion_ingresado = {
                    op: "find_conversacion",
                    token_qr: body.token_qr,
                    numero: numero_enviar,
                    mensaje: mensaje_recibido,
                    documento: documento_recibido,
                    numero_grupo: msg.from.includes("@g.us") ? msg.from : "",
                    ID:id_api
                };
                console.log(currentTimeLog("iniciar_bot", "API SEND REQUEST", { request: conversacion_ingresado }));
                const response_end = await axios.post(url_, conversacion_ingresado);
                console.log(currentTimeLog("iniciar_bot", "API SEND RESPONSE", { response: response_end.data }));
                if (response_end.status === 200 && response_end.data.status === "0") {
                    const arreglo_mensajes = response_end.data.mensajes || [{
                        tipo: response_end.data.tipo,
                        mensaje_salida: response_end.data.mensaje_salida
                    }];
                    for (const mensaje of arreglo_mensajes) {
                        await enviarMensajeUnificado(client, mensaje, numero_enviar,[],msg);
                    }
                    await reenviarMensajes(client, response_end.data);
                }

            } catch (err) {
                console.error(currentTimeLog("iniciar_bot", "Error processing message", { error: err.message }));
            }
        };

        client.on('message', handleMessages);
        console.log(currentTimeLog("iniciar_bot", "Salida"));
    },

    async inicializar(browserP, body, ruta, url, bot) {
        console.log(currentTimeLog("inicializar", "Entrada", { body }));
        let client = null;
        try {
            if (body.carga_session) {
                const nombreArchivo = path.basename(body.carga_session);
                const rutaAbsoluta = path.resolve(ruta, nombreArchivo);

                if (!body.local) await new Promise(resolve => {
                    const response = axios.get(body.carga_session, { responseType: 'stream' });
                    response.data.pipe(fs.createWriteStream(rutaAbsoluta)).on('finish', resolve);
                });

                await new Promise(resolve => {
                    fs.createReadStream(rutaAbsoluta)
                        .pipe(unzipper.Extract({ path: ruta }))
                        .on('entry', entry => entry.autodrain())
                        .promise()
                        .then(resolve)
                        .catch(resolve);
                });

                client = createClientInstance(nombreArchivo.replace("session-", "").replace(".zip", ""), ruta, browserP, body);
            } else {
                client = createClientInstance(body.carga_session || body.graba_session || null, ruta, browserP, body);
            }

            await client.initialize();
            setupEventHandlers(client, url, bot, body);
        } catch (err) {
            console.log(currentTimeLog("inicializar", "Error", { message: err.toString() }));
            client && client.destroy();
            browserP && (await browserP).close();
            return null;
        }
        console.log(currentTimeLog("inicializar", "Salida", { clientInitialized: !!client }));
        return client;
    },

    async  grupocontactos(client, log, inputJson, url) {
        console.log(currentTimeLog("grupocontactos", "Entrada", { log }));
        console.log(currentTimeLog("grupocontactos", "JSON", { inputJson }));
        
        const outputJson = { op: [] };
        for (const group of inputJson) {
            const participants = group.registros.map(registro => {
                return registro.contacto.includes('@c.us') ? registro.contacto : `${registro.contacto}@c.us`;
            });
            try {
                const result = await client.createGroup(group.nombregrupo, participants);
                console.log(currentTimeLog("grupocontactos", "Group Created", result));
                // Actualiza el JSON con los resultados
                group.registros.forEach(registro => {
                    const contact = participants.find(part => part.includes(registro.contacto));
                    const participantResult = result.participants[contact];
    
                    registro.resultado = participantResult && participantResult.statusCode === 200
                        ? 'Agregado exitosamente'
                        : participantResult && participantResult.message
                        ? participantResult.message
                        : 'Error al agregar';
                });
            } catch (error) {
                console.error(currentTimeLog("grupocontactos", "Error creating group", { group: group.nombregrupo, error: error.message }));
                group.registros.forEach(registro => {
                    registro.resultado = 'Error creando grupo';
                });
            }
            outputJson.op.push(group);
        }
        // Notifica el resultado a través de POST a la URL
        if (url) {
            await axios.post(url, { op: "resultado_gruposcontacto", data: outputJson })
                .catch(err => console.error(currentTimeLog("contactos", "Error notificando resultado", { error: err.message })));
        }
        console.log(currentTimeLog("grupocontactos", "Salida", { outputJson }));
        return getStandardResponsePost(0, "OK", outputJson);
    },
    
    async contactos(client, log, url) {
        console.log(currentTimeLog("contactos", "Entrada", { log }));
        const chats = await client.getChats();
        console.log(currentTimeLog("contactos", "chats", { chats }));        
        const contactosFinales = chats.filter(chat => (chat.id && chat.id.server=="c.us")).map(chat => ({ id_contacto: chat.id.user, nombre_contacto: chat.name }));
        if (url) {
            await axios.post(url, { op: "contactos", mensajes: contactosFinales });
        }
        console.log(currentTimeLog("contactos", "Salida", { contactosFinales }));
        return getStandardResponsePost(0, "OK", contactosFinales);
    },

    async grupos(client, log, url) {
        console.log(currentTimeLog("grupos", "Entrada", { log }));
        const chats = await client.getChats();
        console.log(currentTimeLog("grupos", "chats", { chats }));        
        const gruposFinales = chats.filter(chat => chat.isGroup || (chat.id && chat.id.server=="g.us")).map(chat => ({ id_grupo: chat.id._serialized, nombre_grupo: chat.name }));
        if (url) {
            await axios.post(url, { op: "grupos", mensajes: gruposFinales });
        }
        console.log(currentTimeLog("grupos", "Salida", { gruposFinales }));
        return getStandardResponsePost(0, "OK", gruposFinales);
    },

    async validar_whatsapp(client, numeros, log, intervalo, url, cantidad) {
        console.log(currentTimeLog("validar_whatsapp", "Entrada", { numeros }));
        if (!numeros) return getStandardResponsePost(1, "NO EXISTEN VALIDACIONES A ENVIAR", {});

        let validaciones = [];
        let sessionClosed = false;

        for (let i = 0; i < numeros.length; i++) {
            if (sessionClosed) break;
            if(numeros[i].numero){
                numeros[i].estado = await client.getNumberId(numeros[i].numero) ? "SI" : "NO";
                validaciones.push({ posicion: numeros[i].posicion, estado: numeros[i].estado });
                if (i % cantidad === 0 || i + 1 === numeros.length) {
                    await axios.post(url, { op: "save_validanumero", validar_numero: validaciones });
                    validaciones = [];
                }
                if (sessionClosed) return getStandardResponsePost(1, "No se puede inicializar la session enviada de whatsapp, genere un nuevo token", []);
                await new Promise(resolve => setTimeout(resolve, intervalo));
            }
        }

        console.log(currentTimeLog("validar_whatsapp", "Salida", { validaciones }));
        return getStandardResponsePost(0, "OK", validaciones);
    },

    async notificar(client, mensajes, log, intervalo, url, cantidad) {
        console.log(currentTimeLog("notificar", "Entrada", { mensajes }));
        if (!mensajes) return getStandardResponsePost(1, "NO EXISTEN MENSAJES A ENVIAR", {});
    
        let validaciones = [];
        let sessionClosed = false;
        let datosUrl = [];
        for (let i = 0; i < mensajes.length; i++) {
            if (sessionClosed) break;
            // Handle multiple numbers separated by semicolons
            const numeros = (mensajes[i].numero + "").split(";");
            for (let numero of numeros) {
                try {
                    // se valida el numero
                    var continuar = true;
                    if(mensajes[i].aplicavalidacion=="SI"){
                        var estado_validacion = await client.getNumberId(numero) ? "SI" : "NO";
                        if(estado_validacion=="NO"){
                            continuar=false;
                            mensajes[i].estado = "NO ES NUMERO VALIDO";
                            validaciones.push(mensajes[i]);
                        }        
                        console.log(currentTimeLog("aplicavalidacion", "RESULTADO DE NOTIFICACION", { validacion: estado_validacion }));
                    }
                    if(continuar){
                        numero = numero.includes("@") ? numero : `${numero}@c.us`;
                        const respuesta = await enviarMensajeUnificado(client, mensajes[i], numero, datosUrl,"");
                        mensajes[i].estado = respuesta.estado;
                        validaciones.push(mensajes[i]);
                    }
                    if (i % cantidad === 0 || i + 1 === mensajes.length) {
                        console.log(currentTimeLog("notificar", "API SEND REQUEST", { request: { op: "resultado", mensajes: validaciones } }));
                        var response_end_ =  await axios.post(url, { op: "resultado", mensajes: validaciones });
                        console.log(currentTimeLog("notificar", "API SEND RESPONSE", { response: response_end_.data }));    
                        validaciones = [];
                    }    
                    if (sessionClosed){ 
                        return getStandardResponsePost(1, "No se puede inicializar la session enviada de whatsapp, genere un nuevo token", []);
                    }
                    
                    if (continuar == true && mensajes[i].intervalo_mensaje) {
                        intervalo = parseInt(mensajes[i].intervalo_mensaje) * 1000;
                    }else{
                        intervalo = 1000;
                    }
                    await new Promise(resolve => setTimeout(resolve, intervalo));
                } catch (error) {
                    mensajes[i].estado = "Error";
                    console.log(currentTimeLog("notificar", "Error", { message: error instanceof Error ? error.message : 'Error sending message' }));
                    if (error.message.includes("Session closed")) sessionClosed = true;
                }
            }
        }
    
        console.log(currentTimeLog("notificar", "Salida", { validaciones }));
        return getStandardResponsePost(0, "OK", validaciones);
    }
};

const createClientInstance = (sessionName, dataPath, browserP, body) => {
    const puppeteerOptions = (body.autobrowserlinux || body.autobrowserwindows) ? { browserWSEndpoint: browserP.wsEndpoint() } : {};
    const authStrategy = sessionName ? new LocalAuth({ clientId: sessionName, dataPath, ...puppeteerOptions }) : undefined;

    return new Client({ webVersionCache: { type: 'none' }, puppeteer: puppeteerOptions, authStrategy });
};

const setupEventHandlers = (client, url, bot, body) => {
    var contador =0;
    client.on('ready', () => {
        console.log(currentTimeLog("setupEventHandlers", "Client Ready", { user: client.info.me.user }));
        if (url) axios.post(url, { op: "qr", qr: "CONECTADO", numero: client.info.me.user, session: body.graba_session, estado: "CONECTADO", ID: body.ID }).catch(err => console.error(err.message));
    });

    client.on('qr', qr => {
        console.log(currentTimeLog("setupEventHandlers", "QR Received", { qr }));
        if (url) {
            axios.post(url, { op: "qr", qr, session: body.graba_session, ID: body.ID }).catch(err => console.error(err.message));
        } else {
            qrcode.generate(qr, { small: true });
        }
        contador++;                                    
        if (contador > 5) {
            console.log(bot + 'READY NO RECEIVED CONTADOR 5');
            if (url) {
                axios.post(url,{ "op": "qr", "qr": "NO CONECTADO", "session": body.graba_session, "ID": body.ID }).catch(err => console.error(err.message));
            }
            throw "SE ELIMINA POR NOTIFICACION";
        }        
    });
    client.on('disconnected', reason => {
        console.log(currentTimeLog("setupEventHandlers", "Client Disconnected", { reason }));
        if (url) axios.post(url, { op: "qr", qr: "NO CONECTADO", session: body.graba_session, ID: body.ID }).catch(err => console.error(err.message));
    });
};

module.exports = WhatsappAnlusoft;