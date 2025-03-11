import 'dotenv/config';
import * as chatgpt from "../../../utilsnegociochatgpt/UtilsApi.mjs";
//import * as dynamo from "../../../utilscomunes/Dynamo.mjs";
import * as utils from "../../../utilscomunes/Api.mjs";
import * as redis from "../../../utilscomunes/Redis.mjs";

//const sleep = ms => new Promise(res => setTimeout(res, ms));

var id_api = "";
var sheet_qr = "";
var sheet_blacklist = "";
var origen = "";
var sheet_conversacion = [
  ["Evento", "Entrada", "Retornar", "Tipo Entrada", "Salida Texto"],
  ["Start", "REINICIAR;%%%", "api_gpt", "TEXTO", ""],
  ["api_gpt", "", "api_gpt", "TEXTO", ""],
  ["Error", "", "", "", "Ups no entienndo"]];
const eliminarcache = async (tabla, nombre) => {
  return (origen == "REDIS")?await redis.deleteCachedApiResponse(nombre):await dynamo.eliminarPorIdIncluido(tabla, nombre)
}
const actualizarcache = async (tabla, nombre, idfechahora, mensaje_buscar,data,tiempo) => {
  if(origen == "REDIS"){
    await redis.setCachedApiResponse(nombre, JSON.stringify({ "ID":"1","transaccion":idfechahora, "mensaje_buscar": mensaje_buscar, "data": data}), tiempo)
  }else{
    await dynamo.updatecache(nombre, tabla, idfechahora, mensaje_buscar);
  }
}
const insertarcache = async (tabla, nombre, data, tiempo) => {
  if(origen == "REDIS"){
    await redis.setCachedApiResponse(nombre, JSON.stringify({ "ID":"2","data": data}), tiempo)
  }else{
    await dynamo.insertarttl({ "ID": nombre, "data": data }, tabla, tiempo);
  }
}
const consultarcache = async (tabla, nombre) => {
  if(origen == "REDIS"){
    var json = await redis.getCachedApiResponse(nombre);
    if(json){
      return JSON.parse(json);
    }else{
      return "";
    } 
  }else{
    return await dynamo.consulta(nombre, tabla);
  }
}

const obtenerregistrossheet = async (insertar) => {
  try {
    sheet_qr = await consultarcache(process.env.DYNAMODBCONFIG, "sheet_qr" + id_api);
    if (sheet_qr) {
      sheet_qr = (sheet_qr.data ? JSON.parse(sheet_qr.data) : "");
    }
    sheet_blacklist = await consultarcache(process.env.DYNAMODBCONFIG, "sheet_blacklist" + id_api);
    if (sheet_blacklist) {
      sheet_blacklist = (sheet_blacklist.data ? sheet_blacklist.data : "");
    }
    if (!(sheet_qr) || insertar) {
      var response_end = await utils.post_api("https://script.google.com/macros/s/" + id_api + "/exec", { "op": "obtenersheet" }, "");
      //console.log(JSON.stringify(response_end));
      if (response_end.status == "0") {
        sheet_qr = response_end.data.configuracion;
        await insertarcache(process.env.DYNAMODBCONFIG, "sheet_qr" + id_api, JSON.stringify(sheet_qr), 360);
        if (response_end.data.blacklist) {
          sheet_blacklist = response_end.data.blacklist;
          await insertarcache(process.env.DYNAMODBCONFIG, "sheet_blacklist" + id_api, sheet_blacklist, 360);
        }
      }
    }
  } catch (error) {
    //console.log(error);
  }
}

const enviar_bot_entrenamiento = async (numero_enviar, mensaje_buscar, tipo_mensaje, numerogrupo, confg_chatgpt, id_adicional) => {
  var conversacion_ingresado = { "evento": "Error", "mensaje_entrada": mensaje_buscar, "mensaje_salida": "error tecnico" };
  var idfechahora = new Date().getTime();
  var existe_conversacion = "";
  try {
    existe_conversacion = await consultarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + numero_enviar);
    if (existe_conversacion) {
      //      console.log("existe_conversacion",JSON.stringify(existe_conversacion));    
      mensaje_buscar = (existe_conversacion.transaccion && existe_conversacion.mensaje_buscar ? existe_conversacion.mensaje_buscar + " " + mensaje_buscar : mensaje_buscar);
      existe_conversacion = existe_conversacion.data;
    }
     //   console.log("mensaje_buscar"+mensaje_buscar);
    await actualizarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + numero_enviar, idfechahora, mensaje_buscar,(existe_conversacion?JSON.stringify(existe_conversacion):""),2880);
    //console.log("idss",idss);    
    var conversaciones = [];
    //      console.log("confg_chatgpt", confg_chatgpt);
    //FILTRAR E BASE AL PERFIL
    conversacion_ingresado = await utils.obtenerevento(numero_enviar, mensaje_buscar, (tipo_mensaje == "IMAGEN" ? "TEXTO" : tipo_mensaje), existe_conversacion, sheet_conversacion, { "noaplica": "" }); // SE OBTIENE EL EVENTOS
     //     console.log("enviar_bot conversacion_ingresado" + JSON.stringify((conversacion_ingresado)), conversacion_ingresado.status);
    if (conversacion_ingresado.status == "0") {
      conversaciones = conversacion_ingresado.conversaciones;
      conversacion_ingresado.conversaciones = [];
    } else {
      return { status: "-1", message: "No existe el evento" }
    }
    var flag_close = false;
    //console.log("conversacion_ingresado", JSON.stringify(conversacion_ingresado));
    if (conversacion_ingresado.evento == "api_gpt" || (conversacion_ingresado.evento == "Start" && conversacion_ingresado.retornar == "api_gpt" && !conversacion_ingresado.mensaje_salida)) {
      var its = [{ "role": "user", "content": mensaje_buscar }];
      if (/*tipo_mensaje=="IMAGEN" && */id_adicional) {
        its = [{ "role": "user", "content": [{ "type": "text", "text": mensaje_buscar }, { "type": "image_url", "image_url": { "url": id_adicional } }] }];
        if (id_adicional.length > 1000) {
          conversacion_ingresado.mensaje_entrada_imagen = "";// se pone a vacio para no afectar al dynamodb
        } else {
          conversacion_ingresado.mensaje_entrada_imagen = id_adicional;
        }
      }
      if (confg_chatgpt.tipo == "DEEPSEEK_ASISTENTE") {
        var salida_gpt = await chatgpt.eventoNotificacionDeepseek(its, conversaciones, confg_chatgpt);
       // console.log("salida_gpt DEEPSEEK_ASISTENTE" + JSON.stringify(salida_gpt));
        conversacion_ingresado.mensaje_salida = salida_gpt.message;
      }else if (confg_chatgpt.tipo == "QWEN_ASISTENTE") {
        var salida_gpt = await chatgpt.eventoNotificacionQwen(its, conversaciones, confg_chatgpt);
       // console.log("salida_gpt QWEN_ASISTENTE" + JSON.stringify(salida_gpt));
        conversacion_ingresado.mensaje_salida = salida_gpt.message;
      } else if (confg_chatgpt.tipo == "CHATGPTAPI_ASISTENTE") {
        var salida_gpt = await chatgpt.eventoNotificacionChatgpt(its, conversaciones, confg_chatgpt);
        //console.log("salida_gptCHATGPTAPI_ASISTENTE" + id_api + JSON.stringify(salida_gpt));
        conversacion_ingresado.mensaje_salida = salida_gpt.message;
      }
      var registros_ = (confg_chatgpt.palabrascierre ? (confg_chatgpt.palabrascierre + "").split(":::") : []);
      for (var ll = 0; ll < registros_.length; ll++) {
        if (registros_[ll] && (conversacion_ingresado.mensaje_salida).toUpperCase().includes((registros_[ll]).toUpperCase())) {
          conversaciones.push(conversacion_ingresado);
          var jo_notificacion_cierre = { "status": "-1", "message": "vacio" }
          var ultimaimagenenviada = "";
          if (confg_chatgpt.tipo == "DEEPSEEK_ASISTENTE") {
            jo_notificacion_cierre = await chatgpt.cierreNotificacionDeepseek(confg_chatgpt.cierre, conversaciones, confg_chatgpt);
            //console.log("JSO" + JSON.stringify(jo_notificacion_cierre));
            if (jo_notificacion_cierre.data) {
              if (salida_gpt.message.includes("%url_link%")) {
                const { nombre, precio, id } = jo_notificacion_cierre.data;
                const urlGenerada = await pasarella.generarURLPago(nombre, precio, id);
                salida_gpt.message = salida_gpt.message.replace("%url_link%", urlGenerada);
              }
            }
          } else if (confg_chatgpt.tipo == "QWEN_ASISTENTE") {
            jo_notificacion_cierre = await chatgpt.cierreNotificacionQwen(confg_chatgpt.cierre, conversaciones, confg_chatgpt);
            //console.log("JSO" + JSON.stringify(jo_notificacion_cierre));
            if (jo_notificacion_cierre.data) {
              if (salida_gpt.message.includes("%url_link%")) {
                const { nombre, precio, id } = jo_notificacion_cierre.data;
                const urlGenerada = await pasarella.generarURLPago(nombre, precio, id);
                salida_gpt.message = salida_gpt.message.replace("%url_link%", urlGenerada);
              }
            }
          } else if (confg_chatgpt.tipo == "CHATGPTAPI_ASISTENTE") {
            confg_chatgpt.cierre = confg_chatgpt.cierre.replace("@celular@", numero_enviar);
            jo_notificacion_cierre = await chatgpt.cierreNotificacionChatgpt(confg_chatgpt.cierre, conversaciones, confg_chatgpt);
            //console.log("JSO" + JSON.stringify(jo_notificacion_cierre));
          }
          flag_close = true;
          if (jo_notificacion_cierre.status == "0") {
            // sei existe numero grupo se envia
            if(numerogrupo){
              jo_notificacion_cierre.data.numerogrupo=numerogrupo;
            }
            var respuesta = await chatgpt.grabrasolicitudesapi("https://script.google.com/macros/s/" + id_api + "/exec", id_api, numero_enviar, "SOLICITADO", jo_notificacion_cierre.data);
            var aplicareenviar = true;
            if(respuesta.status=="0" && respuesta.data.status=="0"){
              // se generar el nuevo mensaje de conversacion 
              //conversacion_ingresado.mensaje_salida+= respuesta.data.message;
              if(respuesta.data.numeroreenviar && respuesta.data.mensajereenviar){
                conversacion_ingresado.numeroreenviar =respuesta.data.numeroreenviar;
                
               //Elimina las lineas donde no tenga valor
               respuesta.data.mensajereenviar = respuesta.data.mensajereenviar.split("\n").filter(linea => !/\s*@\w+@\./.test(linea.trim())).join("\n");

               // respuesta.data.mensajereenviar = respuesta.data.mensajereenviar.replace("@referenciadellugar@", "No especifico");
               // respuesta.data.mensajereenviar = respuesta.data.mensajereenviar.replace("@pagotransferencia@", "No especifico");
               // respuesta.data.mensajereenviar = respuesta.data.mensajereenviar.replace("@comentarioadicional@", "No especifico");
               // respuesta.data.mensajereenviar = respuesta.data.mensajereenviar.replace("@horaderecogida@", "No Aplica");
               // respuesta.data.mensajereenviar = respuesta.data.mensajereenviar.replace("@referenciadellugar@", "No especifico");
               console.log("Lalo Prueba 1: " + respuesta.data.mensajereenviar);
               

                conversacion_ingresado.reenviar = respuesta.data.mensajereenviar;
                aplicareenviar=false;
              }
            }           
            try {
              if (aplicareenviar==true && sheet_qr[9][1] == "SI" && sheet_qr[9][3] && sheet_qr[9][5]) {
                conversacion_ingresado.numeroreenviar = "" + sheet_qr[9][3];
                conversacion_ingresado.reenviar = sheet_qr[9][5];
                var salidacierre = jo_notificacion_cierre.data;
                Object.keys(salidacierre).forEach(function (key) {
                  if (salidacierre[key]) {
                    conversacion_ingresado.reenviar = conversacion_ingresado.reenviar.replace("@" + key + "@", salidacierre[key]);
                  }
                });
                //en caso aplique
                conversacion_ingresado.reenviar = conversacion_ingresado.reenviar.replace("@celular@", numero_enviar);
              }
            } catch (error) {
            }
          }
          break;
        }
      }
    }

    if (conversacion_ingresado.evento.includes("End")) {
      flag_close = true;
    }
    var conversacion_ingresado_temp = conversacion_ingresado;
    conversaciones.push(conversacion_ingresado_temp);
    if ((conversacion_ingresado.evento).includes("Start") || flag_close) {
      conversaciones = [];
      if ((conversacion_ingresado.evento).includes("Start")) {
        conversaciones.push(conversacion_ingresado_temp);
      }
    }
    var cache = await consultarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + numero_enviar);
    if (cache) {
      if (cache.transaccion == idfechahora || Math.abs(cache.transaccion - idfechahora) > 10000) {// 10 segundos
        await insertarcache(process.env.DYNAMODBCONFIG, 'conversaciones' + id_api + "" + numero_enviar, JSON.stringify(conversaciones), 2880);
        return conversacion_ingresado;
      }
    }
  } catch (e) {
    //console.log("eeeeeeeeeeee"+e);
    return { status: "-1", message: e.toString() };
  }
  return { status: "0", message: "" };
}

const enviar_bot = async (webhook, mensaje_buscar, existe_conversacion_v2, confg_chatgpt, tipo_adicional, id_adicional, numero_enviar, palabrareinicio) => {
  var existe_conversacion = "";
  var idfechahora = new Date().getTime();
  var salida_gpt = { status: "-1", message: "error tecnico" }
  try {
    var aplicaeliminarultimomensajeruns = false;
    existe_conversacion = await consultarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + numero_enviar);
    if (existe_conversacion) {
      //      console.log("existe_conversacion",JSON.stringify(existe_conversacion));    
      mensaje_buscar = (existe_conversacion.transaccion && existe_conversacion.mensaje_buscar ? existe_conversacion.mensaje_buscar + " " + mensaje_buscar : mensaje_buscar);
      aplicaeliminarultimomensajeruns = (existe_conversacion.transaccion && existe_conversacion.mensaje_buscar ? true : false);
      existe_conversacion = existe_conversacion.data;
      if ((mensaje_buscar == "REINICIAR") || (palabrareinicio && (palabrareinicio + "").toUpperCase().includes(("" + mensaje_buscar).toUpperCase()))) {
        // se reinicia
        existe_conversacion = "";
      }
    }
    await actualizarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + numero_enviar, idfechahora, mensaje_buscar,existe_conversacion,2880);
    if (sheet_qr) {
      if (sheet_qr[7][1] == "CHATGPT_ASISTENTE") {
        salida_gpt = await chatgpt.eventoAsistenteChatgptStream(webhook, existe_conversacion, mensaje_buscar, confg_chatgpt, tipo_adicional, id_adicional, numero_enviar, id_api, "INICIAR", "", aplicaeliminarultimomensajeruns);
      }
    } else {
      salida_gpt = await chatgpt.eventoAsistenteChatgptStream(webhook, existe_conversacion, mensaje_buscar, confg_chatgpt, tipo_adicional, id_adicional, numero_enviar, id_api, "INICIAR", "", aplicaeliminarultimomensajeruns);
    }
    //    console.log("salida_gpt",salida_gpt);
    var cache = await consultarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + numero_enviar);
    if (cache) {
      //console.log("aaaaaa"+JSON.stringify(cache));
      if (cache.transaccion == idfechahora || Math.abs(cache.transaccion - idfechahora) > 10000) {// 10 segundos
        await insertarcache(process.env.DYNAMODBCONFIG, 'conversaciones' + id_api + "" + numero_enviar, salida_gpt.hilo, 2880);
        return salida_gpt;
      }
    }
  } catch (e) {
   // console.log("eeeeeeee" + e)
    return { status: "-1", message: e.toString() };
  }
  return { status: "0", message: "" };
}


export async function validar(event) {
  //console.log("event comunes" + JSON.stringify(event));
  id_api = "vacio";
  let operacion = JSON.parse(event.body);
  if (event.pathParameters && event.pathParameters.id) {
    id_api = event.pathParameters.id;
  } else if (operacion.ID) {
    // se elimina en caso exista ID
    id_api = operacion.ID;
  }
  if (event.path && (event.path+"").includes("anlusoftredis")){// || id_api=="AKfycbwet6y6RuHHrpoeCski8RthCbr34M7h3KSMsnpXt45I27wZ11jBD4LeByJnBY1xO9Rj") {
    origen = "REDIS";
  }
  if (operacion.op == "cargarcache") {
    // eliminan los registros que coincidan
    console.log("OPERACCCIOOONNNNNNNNN ",JSON.stringify(operacion));
    var salida = "ERROR ";
    if (operacion.bot && operacion.bot.conversacion_bot && operacion.bot.conversacion_bot[0].inicio == "memoria") {
      salida = "NO SE ELIMINO";
      await obtenerregistrossheet(true);
    }else if (operacion.bot && operacion.bot.conversacion_bot 
      && operacion.bot.conversacion_bot[0].inicio == "actualizarIA" 
      && operacion.bot.conversacion_bot[0].numero 
      && operacion.bot.conversacion_bot[0].mensaje) {
      salida = "SE ACTUALIZO REGISTROS";
      var existe_conversacion = await consultarcache(process.env.DYNAMODBCONFIG, "conversaciones" + id_api + "" + operacion.bot.conversacion_bot[0].numero);
      if (existe_conversacion) {
        try {
          var filtroconversacion = JSON.parse(existe_conversacion.data);
          var ultimaconversa = JSON.parse(JSON.stringify(filtroconversacion[filtroconversacion.length - 1]));
          ultimaconversa.mensaje_salida = operacion.bot.conversacion_bot[0].mensaje;
          ultimaconversa.mensaje_entrada = "";
          filtroconversacion.push(ultimaconversa);
          await insertarcache(process.env.DYNAMODBCONFIG, 'conversaciones' + id_api + "" + operacion.bot.conversacion_bot[0].numero, JSON.stringify(filtroconversacion), 2880);
        } catch (errorremark) {
          console.log("ERRORORRRRRR REMA" + errorremark);
        }
      }
      await obtenerregistrossheet(false);
    } else {
      salida = await eliminarcache(process.env.DYNAMODBCONFIG, id_api);
      await obtenerregistrossheet(true);
    }
    return { "status": "0", "message": "OK", "msj": salida, "id_api": id_api, "tabla": process.env.DYNAMODBCONFIG };
  } else if (operacion.op == "find_conversacion") {
    //console.log("find_conversacion:::::::" + JSON.stringify(operacion))
    await obtenerregistrossheet(false);
    operacion.numero = (operacion.numero).substring(0, (operacion.numero).lastIndexOf("@"));
    if (sheet_blacklist) {
      if ((sheet_blacklist + "").includes("%%%") || (sheet_blacklist + "").includes(operacion.numero + "")) {
        return { "status": "-1", "message": "Esta en blacklist" };
      }
    }
    var tipo_adicional = "";
    var id_adicional = "";
    var confg_chatgpt = { "token_chatgpt": "token_chatgpt" }
    if (sheet_qr) {
      if (sheet_qr[7][1] == "DEEPSEEK_ASISTENTE" || sheet_qr[7][1] == "QWEN_ASISTENTE") {
        confg_chatgpt = { "tipo": sheet_qr[7][1], "token_chatgpt": sheet_qr[7][3], "entrenamiento": sheet_qr[8][1], "palabrascierre": sheet_qr[8][3], "cierre": sheet_qr[8][5] };
        if (operacion.mensaje == "documento_send" && (operacion.documento.mimetype + "").includes("audio/ogg")) {
          operacion.mensaje = "te envio un audio";
        } else if (operacion.mensaje == "documento_send" && ((operacion.documento.mimetype + "").includes("image/jpeg") || (operacion.documento.mimetype + "").includes("image/jpg") || (operacion.documento.mimetype + "").includes("image/png"))) {
          operacion.mensaje = "te envio una imagen";
        }
      } else if (sheet_qr[7][1] == "CHATGPT_ASISTENTE" || sheet_qr[7][1] == "CHATGPTAPI_ASISTENTE") {
        if (sheet_qr[7][1] == "CHATGPT_ASISTENTE") {
          confg_chatgpt = { "token_chatgpt": sheet_qr[7][3], "version_chatgpt": "v2", "asistente_chatgpt": sheet_qr[7][5] }
          if((sheet_qr[7][13]+"") ){
            confg_chatgpt.maximoesperaseg=parseInt(sheet_qr[7][13]+"");
          }
        } else if (sheet_qr[7][1] == "CHATGPTAPI_ASISTENTE") {
          confg_chatgpt = { "model": sheet_qr[7][11], "tipo": sheet_qr[7][1], "token_chatgpt": sheet_qr[7][3], "entrenamiento": sheet_qr[8][1], "palabrascierre": sheet_qr[8][3], "cierre": sheet_qr[8][5] };
        }
        var tipo = "";
        if (operacion.mensaje == "documento_send" && (operacion.documento.mimetype + "").includes("audio/ogg")) {
          var salida_audio = await chatgpt.obteneraudiobase64towhisper(((operacion.tipo + "").includes("audiooga") ? "oga" : "ogg"), operacion.documento.data, confg_chatgpt.token_chatgpt);
          if (salida_audio.status == "0") {
            operacion.mensaje = salida_audio.message;
          } else {
            operacion.mensaje = "hola";
          }
        } else if (operacion.mensaje == "documento_send" && ((operacion.documento.mimetype + "").includes("image/jpeg") || (operacion.documento.mimetype + "").includes("image/jpg") || (operacion.documento.mimetype + "").includes("image/png"))) {
          if (sheet_qr[7][1] == "CHATGPT_ASISTENTE") {
            var salida_imagen = await chatgpt.chatgpt_subir_archivo(operacion.documento.data, "" + new Date().getTime() + ".png", confg_chatgpt.token_chatgpt);
            operacion.mensaje = "te envio imagen";
            if (salida_imagen.status == "0") {
              tipo_adicional = "imagen";
              id_adicional = salida_imagen.fileid;
            }
          } else if (sheet_qr[7][1] == "CHATGPTAPI_ASISTENTE") {
            // se pregunta si se sube al google drive cliente
            try {
              if (sheet_qr[9][7]) {
                var response_end = await utils.post_api("https://script.google.com/macros/s/" + id_api + "/exec", { "op": "subirimagen", "data": operacion.documento.data }, "");
                if (response_end.status == "0" && response_end.data.status == "0") {
                  id_adicional = response_end.data.url;
                }
              }
            } catch (error) {
            }
            if (!id_adicional) {
              id_adicional = "data:image/jpeg;base64," + operacion.documento.data;
            }
          }
        } else if (operacion.mensaje == "ubicacion_send") {
          operacion.mensaje = "te envio direccion GPS es latitud : " + operacion.documento.latitud + " ,longitud :" + operacion.documento.longitud;
        }
      }
    }
    var salida = "";
    if (sheet_qr && (sheet_qr[7][1] == "DEEPSEEK_ASISTENTE" || sheet_qr[7][1] == "QWEN_ASISTENTE" || sheet_qr[7][1] == "CHATGPTAPI_ASISTENTE")) {
      salida = await enviar_bot_entrenamiento(operacion.numero, operacion.mensaje, "TEXTO", (operacion.numero_grupo?operacion.numero_grupo:""), confg_chatgpt, id_adicional);
      
      //console.log("SALIDAAAAAAAAAAA",JSON.stringify(salida));
    } else {
      salida = await enviar_bot("https://script.google.com/macros/s/" + id_api + "/exec", operacion.mensaje, operacion.hilo, confg_chatgpt, tipo_adicional, id_adicional, operacion.numero, operacion.palabrareinicio);
    }
    salida.mensajes = (await utils.generarmensajeswhatsappnooficial(salida.message ? salida.message : salida.mensaje_salida, operacion, sheet_qr));
    if(salida.mensaje_salida_2){
      var mensajes_2 = (await utils.generarmensajeswhatsappnooficial(salida.mensaje_salida_2, operacion, sheet_qr));
      salida.mensajes = salida.mensajes.concat(mensajes_2);
      salida.mensaje_salida_2 = "";
    }
    salida.mensaje_salida = ""; 
    return salida;
  } else if (operacion.numero) {
    var tipo_adicional = "";
    var id_adicional = "";
    if ((operacion.tipo + "").includes("audio")) {
      var salida_audio = await chatgpt.obteneraudiobase64towhisper(((operacion.tipo + "").includes("audiooga") ? "oga" : "ogg"), operacion.base64, operacion.configuracion.token_chatgpt);
      //console.log(JSON.stringify(salida_audio));
      if (salida_audio.status == "0") {
        operacion.mensaje = salida_audio.message;
      } else {
        operacion.mensaje = "hola";
      }
    } else if (operacion.tipo == "image") {
      var salida_imagen = await chatgpt.chatgpt_subir_archivo(operacion.base64, "" + new Date().getTime() + ".png", operacion.configuracion.token_chatgpt);
      //console.log(JSON.stringify(salida_imagen));
      operacion.mensaje = "te envio imagen";
      if (salida_imagen.status == "0") {
        tipo_adicional = "imagen";
        id_adicional = salida_imagen.fileid;
      }
    } else if (operacion.tipo == "imagenurl") {
      tipo_adicional = "imagenurl";
      id_adicional = operacion.base64;
    }
    id_api = operacion.sheet_id;
    return await enviar_bot(operacion.webhook, operacion.mensaje, operacion.hilo, operacion.configuracion, tipo_adicional, id_adicional, operacion.numero, operacion.palabrareinicio);
  } else {
    return { "status": "-1", "message": "Debe enviar datos completos" };
  }
}
