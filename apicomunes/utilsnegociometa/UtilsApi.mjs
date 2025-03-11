import * as utils from "../utilscomunes/Api.mjs";
import * as chatgpt from "../utilsnegociochatgpt/UtilsApi.mjs";

export async function notificarmensajesmeta(conversacion_ingresado, numero_enviar, token, api, api_webhook) {
  var jo = { "metasend": [], "status": "0" };
  if (conversacion_ingresado.mensaje_salida) {
    jo.metasend.push(await notificarmeta(conversacion_ingresado.mensaje_salida, numero_enviar, token, api, api_webhook));
  }
  if (conversacion_ingresado.mensaje_salida_2) {
    jo.metasend.push(await notificarmeta(conversacion_ingresado.mensaje_salida_2, numero_enviar, token, api, api_webhook));
  }
  if (conversacion_ingresado.reenviar && conversacion_ingresado.numeroreenviar) {
    jo.metasend.push(await notificarmeta(conversacion_ingresado.reenviar, conversacion_ingresado.numeroreenviar, token, api, api_webhook));
  }
  if (conversacion_ingresado.reenviar_2 && conversacion_ingresado.numeroreenviar_2) {
    jo.metasend.push(await notificarmeta(conversacion_ingresado.reenviar_2, conversacion_ingresado.numeroreenviar_2, token, api, api_webhook));
  }
  return jo;
}
export async function obtenermetaaudiobase64atexto(documento_id, token, token_chatgot) {
  var jo = { status: "-1", message: "OK", data: { texto: "Hola" } }
  try {
    var response_inicio = await utils.get_api("https://graph.facebook.com/v15.0/" + documento_id,[{"id": "Authorization", "valor": "Bearer " + token}]);
    console.log("PASO 1", JSON.stringify(response_inicio));
    if (response_inicio.status == 0) {
      var respuesta_meta = await utils.getbuffer_api(response_inicio.data.url,[{"id": "Authorization", "valor": "Bearer " + token}]);
      if (respuesta_meta.status == "0") {
        jo = await chatgpt.obteneraudiobase64towhisper("ogg",respuesta_meta.data.base, token_chatgot);
        /*
        var respuesta_ogg_mp3 = await convertir_ogg_mp3("ogg", respuesta_meta.data.base);
        console.log(JSON.stringify(respuesta_ogg_mp3));
        if (respuesta_ogg_mp3.status == "0") {
          var jo_notificacion_audio = await convertir_audio_whisper(respuesta_ogg_mp3.base64, respuesta_ogg_mp3.nombrearchivo, token_chatgot);
          console.log(JSON.stringify(jo_notificacion_audio));
          if (jo_notificacion_audio.status == "0") {
            jo = { status: "0", message: jo_notificacion_audio.message }
          } else {
            jo = { status: "1", message: "No se puede obtener texto enn whisper" }
          }
        } else {
          jo = { status: "1", message: "No se puede convertir de ogg a mp3" }
        }*/
      } else {
        jo = { status: "1", message: "No existe audio en meta" }
      }
    } else {
      jo = { status: "1", message: "No existe archivo en meta" }
    }
  } catch (e) {
    console.log(e);
    jo = { status: "-1", message: e }
  }
  return jo;
}

export async function obtenermetaimagenurl(documento_id, token) {

  var jo = { status: "-1", message: "OK", data: { texto: "Hola" } }
  try {
    var response_inicio = await utils.get_api("https://graph.facebook.com/v15.0/" + documento_id,[{"id": "Authorization", "valor": "Bearer " + token}]);  
    console.log("PASO 1", JSON.stringify(response_inicio));
    if (response_inicio.status == 0) {
      var respuesta_meta = await utils.getbuffer_api(response_inicio.data.url,[{"id": "Authorization", "valor": "Bearer " + token}]);
      if (respuesta_meta.status == "0") {
        //PENDIENTE//
        /*var respuesta_url = await subir_ftp({ "name": "" + new Date().getTime() + ".png", "base64": respuesta_meta.data.base });
        console.log(JSON.stringify(respuesta_url));
        if (respuesta_url.status == "0") {
          jo = { status: "0", message: "OK", fileid: respuesta_url.data.urlpublica }
        } else {
          jo = { status: "1", message: "No se puede subir el archivo" }
        }*/
      } else {
        jo = { status: "1", message: "No existe la imagen en meta" }
      }
    } else {
      jo = { status: "1", message: "No existe archivo en meta" }
    }
  } catch (e) {
    console.log(e);
    jo = { status: "-1", message: e }
  }
  return jo;
}

export async function datos_meta(operacion) {
  var jo = {};
  try {
    var mensaje_buscar = "";
    var tipo_mensaje = "TEXTO";
    var nombres = "";
    var reenviado = "";
    var adicional="";
    if (operacion.entry[0].changes[0].value.contacts && operacion.entry[0].changes[0].value.contacts[0]) {
      nombres = operacion.entry[0].changes[0].value.contacts[0].profile.name;
    }
    if (operacion.entry[0].changes[0].value.messages[0].context &&
      operacion.entry[0].changes[0].value.messages[0].context.id
    ) {
      reenviado = operacion.entry[0].changes[0].value.messages[0].context.id;
    }
    var numero_enviar = "" + operacion.entry[0].changes[0].value.messages[0].from;
    if (operacion.entry[0].changes[0].value.messages[0].type == "text") {
      mensaje_buscar = operacion.entry[0].changes[0].value.messages[0].text.body;
    } else if (operacion.entry[0].changes[0].value.messages[0].type == "interactive") {
      mensaje_buscar = operacion.entry[0].changes[0].value.messages[0].interactive.button_reply.title;
    } else if (operacion.entry[0].changes[0].value.messages[0].type == "button") {
      mensaje_buscar = operacion.entry[0].changes[0].value.messages[0].button.text;
    } else if (operacion.entry[0].changes[0].value.messages[0].type == "location") {
      mensaje_buscar = JSON.stringify({ "latitud": operacion.entry[0].changes[0].value.messages[0].location.latitude, "longitud": +operacion.entry[0].changes[0].value.messages[0].location.longitude });
      tipo_mensaje = "MAPA"
    } else if (operacion.entry[0].changes[0].value.messages[0].type == "image") {
      if (operacion.entry[0].changes[0].value.messages[0].image.caption) {
        mensaje_buscar = operacion.entry[0].changes[0].value.messages[0].image.caption;
      } else {
        mensaje_buscar = "Adjunta la Imagen";
      }
      if(operacion.urlarchivometa){
        tipo_mensaje = "IMAGEN";
        adicional=operacion.urlarchivometa;
      }
      /*
      PENDIENTE LLAMAR A META
      if (operacion.entry[0].changes[0].value.messages[0].image.caption) {
        mensaje_buscar = operacion.entry[0].changes[0].value.messages[0].image.caption;
        mensaje_buscar = "Adjunta la Imagen";
      } else {
      }*/
    }else if (operacion.entry[0].changes[0].value.messages[0].type == "audio" && operacion.configwebhook.tokenchatgpt) {
      var salida_audio="";
      if(operacion.urlarchivometa){
        salida_audio = await chatgpt.obtenerurlaudiotowhisper(operacion.urlarchivometa,operacion.configwebhook.tokenchatgpt)
      }else{  
        salida_audio = await  obtenermetaaudiobase64atexto(operacion.entry[0].changes[0].value.messages[0].audio.id,operacion.configwebhook.token_meta,operacion.configwebhook.tokenchatgpt);
      }
      console.log(JSON.stringify(salida_audio));
      if(salida_audio.status=="0"){
        mensaje_buscar=salida_audio.message;
      }
    } else if (operacion.tipo_comodin == "comodin") {
      mensaje_buscar = operacion.mensaje_comodin;
    } else {
      tipo_mensaje = "OTROS";
      mensaje_buscar = "Sin Informacion";
    }
    jo.tipo_mensaje = tipo_mensaje;
    jo.mensaje_buscar = mensaje_buscar;
    jo.adicional = adicional;
    jo.numero_enviar = numero_enviar;
    jo.nombres = nombres;
    jo.reenviado = reenviado;
    jo.status = "0";
    jo.message = ' Exito';
  } catch (e) {
    jo.status = "-1";
    jo.message = e.toString();
  }
  console.log("datos_meta" + JSON.stringify(jo));
  return jo;
}

export async function notificarmetaplantillavive(numero, plantilla, salida, adicional, token, api, api_webhook) {
  var jo = {};
  try {
    var payload = {
      "messaging_product": "whatsapp",
      "to": numero,
      "url": api,
      "type": "template",
      "template": {
        "name": plantilla,
        "language": {
          "code": "es"
        },
        "components": []
      }
    };
    if (plantilla == "enviar_cobranza") {
      var texto = [];
      if (salida) {
        texto = salida.split(":::");
      }
      // SE AGREGA LOS PARAMETROS DE TEXTO
      if (texto.length > 0) {
        payload.template.components.push({ "type": "body", "parameters": [] });
        for (var il = 0; il < texto.length; il++) {
          payload.template.components[0].parameters.push({ "type": "text", "text": texto[il].replaceAll("\n", "\\n") });
        }
      }
//      payload.template.components.push({ "type": "button", "sub_type": "url", "index": "1", "parameters": [{ "type": "text", "text": "dashboard?user=" + adicional }] })
      payload.template.components.push({ "type": "header", "parameters": [{ "type": "image", "image": { "link": "https://ue1stg07022024.s3.us-east-1.amazonaws.com/Archivos/51986321853/1730225399174.jpg" } }] });
    } else if (plantilla == "link_toku") {
      payload.template.components.push({ "type": "header", "parameters": [{ "type": "image", "image": { "link": "https://ue1stg07022024.s3.us-east-1.amazonaws.com/Archivos/51986321853/1723509008115.jpeg" } }] })
      payload.template.components.push({ "type": "button", "sub_type": "url", "index": "0", "parameters": [{ "type": "text", "text": salida }] })
      payload.template.components.push({ "type": "button", "sub_type": "url", "index": "1", "parameters": [{ "type": "text", "text": salida }] })
    } else if (plantilla == "toku_fallido") {
      var texto = [];
      if (salida) {
        texto = salida.split(":::");
      }
      // SE AGREGA LOS PARAMETROS DE TEXTO
      if (texto.length > 0) {
        payload.template.components.push({ "type": "body", "parameters": [] });
        for (var il = 0; il < texto.length; il++) {
          payload.template.components[0].parameters.push({ "type": "text", "text": texto[il].replaceAll("\n", "\\n") });
        }
      }
      payload.template.components.push({ "type": "button", "sub_type": "url", "index": "0", "parameters": [{ "type": "text", "text": "dashboard?user=" + adicional }] })
      payload.template.components.push({ "type": "button", "sub_type": "url", "index": "1", "parameters": [{ "type": "text", "text": "dashboard?user=" + adicional }] })

      payload.template.components.push({ "type": "header", "parameters": [{ "type": "image", "image": { "link": "https://ue1stg07022024.s3.us-east-1.amazonaws.com/Archivos/51986321853/1715116990528.jpeg" } }] });

    } else if (plantilla == "envio_documentos") {
      payload.template.components.push({ "type": "header", "parameters": [{ "type": "document", "document": { "link": adicional, "filename": "Documento" } }] });
      payload.template.components.push({ "type": "body", "parameters": [{ "type": "text", "text": salida }] });
    } else if (plantilla == "envio_imagen") {
      payload.template.components.push({ "type": "header", "parameters": [{ "type": "image", "image": { "link": adicional } }] });
      payload.template.components.push({ "type": "body", "parameters": [{ "type": "text", "text": salida }] });
    } else {
      // aplica texto renovar_cliente
      var texto = [];
      if (salida) {
        texto = salida.split(":::");
      }
      // SE AGREGA LOS PARAMETROS DE TEXTO
      if (texto.length > 0) {
        payload.template.components.push({ "type": "body", "parameters": [] });
        for (var il = 0; il < texto.length; il++) {
          payload.template.components[0].parameters.push({ "type": "text", "text": texto[il].replaceAll("\n", "\\n") });
        }
      }
    }
    console.log("NOTIFICAR ::::: " + JSON.stringify(payload));
    jo = await notificarmeta_enviar(payload, token, api, api_webhook);
  } catch (e) {
    jo.status = "-1";
    jo.message = e.toString();
  }
  return jo;
}
export async function notificarmeta(salida, numero, token, api, api_webhook) {
  var jo = {};
  var mensajes = [];
  var metasend = [];
  try {
    var registros_ = (salida.match(/<imagen.*?>.*?<\/imagen\>/g));
    if (registros_ && registros_.length > 0) {
      for (var ii = 0; ii < registros_.length; ii++) {
        salida = salida.replace(registros_[ii], "");
        mensajes.push({ "numero": numero, "tipo": "imagen", "url": registros_[ii].replace("<imagen>", "").replace("</imagen>", "") });
      }
    }
    var registros_ = (salida.match(/<documento.*?>.*?<\/documento\>/g));
    if (registros_ && registros_.length > 0) {
      for (var ii = 0; ii < registros_.length; ii++) {
        salida = salida.replace(registros_[ii], "");
        mensajes.push({ "numero": numero, "tipo": "documento", "url": registros_[ii].replace("<documento>", "").replace("</documento>", "") });
      }
    }
    var registros_ = (salida.match(/https:\/\/[^\s]+\.(png|jpg|jpeg)/gi));
    if (registros_ && registros_.length > 0) {
      for (var ii = 0; ii < registros_.length; ii++) {
        salida = salida.replace(registros_[ii], "");// "[ver imagen 👇]");
        var caption = "";
        try {
          var parts = registros_[ii].split('/');
          var filename = parts[parts.length - 1];
          caption = (filename.split('.'))[0]; // sacar solo el nnombre de la imagen del archivo
        } catch (error) {
        }
        mensajes.push({ "numero": numero, "tipo": "imagen", "url": registros_[ii], "caption": caption });
      }
    }
    var registros_ = (salida.match(/https:\/\/[^\s]+\.(pdf|doc|docx)/gi));
    if (registros_ && registros_.length > 0) {
      for (var ii = 0; ii < registros_.length; ii++) {
        salida = salida.replace(registros_[ii], "");//"[ver documento 👇]");
        mensajes.push({ "numero": numero, "tipo": "documento", "url": registros_[ii] });
      }
    }

    if (salida != "") {
        // cadenas grandes a otificar
        var texto_cadena = (salida).split("\n");
        var cadenas_enviar = [];
        var texto_consolidado = "";
        var cantidad_maxima = 700;
        for (let jl = 0; jl < texto_cadena.length; jl++) {
          if ((texto_consolidado + texto_cadena[jl] + "\n").length > cantidad_maxima) {
            cadenas_enviar.unshift(texto_consolidado);
            texto_consolidado = "";
          } else if (texto_cadena.length == (jl + 1)) {
            texto_consolidado += texto_cadena[jl];
            cadenas_enviar.unshift(texto_consolidado);
          }
          texto_consolidado += texto_cadena[jl] + "\n";
        }
        for (let jl = 0; jl < cadenas_enviar.length; jl++) {
          mensajes.unshift({ "numero": numero, "tipo": "mensaje", "mensaje": cadenas_enviar[jl] });
        }
        //mensajes.unshift({"numero":numero,"tipo":"mensaje","mensaje":salida});  
    }
    console.log("mensajesmensajesmensajes", JSON.stringify(mensajes));
    for (var il = 0; il < mensajes.length; il++) {
      var payload = "";
      if (mensajes[il].tipo == "mensaje") {
        if ((mensajes[il].mensaje+"").includes("</boton>")) {
          var salida = mensajes[il].mensaje;
          payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": mensajes[il].numero,
            "type": "interactive",
            "interactive": {
              "type": "button",
              "body": { "text": "vacio" },
              "action": { "buttons": [] }
            }
          }
          var registros = (salida.match(/<boton.*?>.*?<\/boton\>/g));
          if (registros && registros.length > 0) {
            for (var ii = 0; ii < registros.length; ii++) {
              salida = salida.replace(registros[ii], "");
              payload.interactive.action.buttons.push({ "type": "reply", "reply": { "id": "" + (ii + 1), "title": registros[ii].replace("<boton>", "").replace("</boton>", "") } });
            }
            if (salida != "") {
              payload.interactive.body.text = salida;
            }
          }
        }else{
          payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": mensajes[il].numero,
            "type": "text",
            "text": {
              "preview_url": true,
              "body": mensajes[il].mensaje
            }
          }
        }
      } else if (mensajes[il].tipo == "imagen") {
        payload = {
          "messaging_product": "whatsapp",
          "recipient_type": "individual",
          "to": mensajes[il].numero,
          "type": "image",
          "image": {
            "link": mensajes[il].url
          }
        }
        if (mensajes[il].caption && mensajes[il].caption.includes("_")) {
          payload.image.caption = mensajes[il].caption;
        }
      } else if (mensajes[il].tipo == "documento") {
        payload = {
          "messaging_product": "whatsapp",
          "recipient_type": "individual",
          "to": mensajes[il].numero,
          "type": "document",
          "document": {
            "link": mensajes[il].url,
            "filename": "documento"
          }
        }
      }
      if (payload) {
        metasend.push(await notificarmeta_enviar(payload, token, api, api_webhook));
      }
    }
    jo.status = "0";
    jo.message = ' Exito';
    jo.metasend = metasend;
  } catch (e) {
    console.log("mensajesmensajesmensajesERORORO", e);
    jo.status = "-1";
    jo.message = e.toString();
  }
  return jo;
}

export async function notificarmeta_enviar(payload_, token, api, api_webhook) {
  var jo = {};
  try {
    console.log("META::::",JSON.stringify(payload_));
    payload_.url = api;
    var response_end = await utils.post_api((api_webhook ? api_webhook : api),payload_,[{"id": "Authorization", "valor": "Bearer " + token}]);
    jo.status = "0";
    jo.message = ' Se notifico correctamente';
    jo.metaresponse = response_end;
    jo.metarequest = payload_;
  } catch (e) {
    jo.status = "-1";
    jo.message = e.toString();
    //            console.log("response error meta .", e);
  }
  console.log("notificarmeta_enviar" + JSON.stringify(jo));
  return jo;
}