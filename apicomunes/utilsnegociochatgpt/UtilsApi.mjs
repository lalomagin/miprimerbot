
import 'dotenv/config';
import axios from 'axios';
import FormData from 'form-data';
import * as utils from "../utilscomunes/Api.mjs";
import moment from 'moment';

const sleep = ms => new Promise(res => setTimeout(res, ms));
export async function grabrasolicitudesapi(webhook, id_api, nunmero, estado, payload) {
  var jo = {};
  try {
    console.log("grabrasolicitudesapiid_api " + id_api + " --- " + JSON.stringify(payload));
    payload.estado = estado;
    payload.idpersona = "" + nunmero;
    payload.identificador = id_api;
    payload.fechasistema =  moment().format("DD/MM/yyyy");
    payload.horasistema =  moment().format("HH:mm");
    payload.op = (payload.op ? payload.op : "registrarsolicitudes");
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: webhook,
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };
    console.log(JSON.stringify(config));
    jo = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    console.log(JSON.stringify(jo));
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  console.log("grabrasolicitudesapi", jo);
  return jo;
}

export async function cierreNotificacionQwen(jsonanalizar, _conversaciones, configuracion) {
  var jo = {};
  try {
    var historial = "De la siguiente conversacion analizar: \n\n";
    if (_conversaciones.length > 0) {
      for (var il = 0; il < _conversaciones.length; il++) {
        if (_conversaciones[il].mensaje_entrada) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_entrada + "\n";
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida_2 + "\n";
        }
        if (_conversaciones[il].mensaje_entrada_2) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_entrada_2 + "\n";
        }
        if (_conversaciones[il].mensaje_salida) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida + "\n";
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida_2 + "\n";
        }
        if (_conversaciones[il].mensaje_configuracion) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_configuracion + "\n";
        }
      }
    }
    var payload = { "messages": [{ "role": "system", "content": jsonanalizar }, { "role": "user", "content": historial }], "model": (configuracion.model ? configuracion.model : "qwen-plus") };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
      headers: {
        'Authorization': 'Bearer ' + (configuracion.token ? configuracion.token : configuracion.token_chatgpt),
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };

    //console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log(JSON.stringify(respuesta));
    if (respuesta.status == "0" && respuesta.data.choices && respuesta.data.choices[0].message && respuesta.data.choices[0].message.content) {
      var limpieza = ("" + respuesta.data.choices[0].message.content).trim();//.replaceAll("\n","").replaceAll("\", "");
      var registros = limpieza.substring(limpieza.indexOf("{"), limpieza.lastIndexOf("}") + 1);
      jo.data = JSON.parse("" + registros);
      jo.message = "Exito";
      jo.status = "0"
    } else {
      jo.status = "1"
      jo.message = "Ups no responde Chat GPT " + respuesta.message;
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}

export async function cierreNotificacionDeepseek(jsonanalizar, _conversaciones, configuracion) {
  var jo = {};
  try {
    var historial = "De la siguiente conversacion analizar: \n\n";
    if (_conversaciones.length > 0) {
      for (var il = 0; il < _conversaciones.length; il++) {
        if (_conversaciones[il].mensaje_entrada) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_entrada + "\n";
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida_2 + "\n";
        }
        if (_conversaciones[il].mensaje_entrada_2) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_entrada_2 + "\n";
        }
        if (_conversaciones[il].mensaje_salida) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida + "\n";
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida_2 + "\n";
        }
        if (_conversaciones[il].mensaje_configuracion) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_configuracion + "\n";
        }
      }
    }
    var payload = { "stream": false, "messages": [{ "role": "system", "content": jsonanalizar }, { "role": "user", "content": historial }], "model": "deepseek-chat" };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Authorization': 'Bearer ' + configuracion.token_chatgpt,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };

    //console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log(JSON.stringify(respuesta));
    if (respuesta.status == "0" && respuesta.data.choices && respuesta.data.choices[0].message && respuesta.data.choices[0].message.content) {
      var limpieza = ("" + respuesta.data.choices[0].message.content).trim();//.replaceAll("\n","").replaceAll("\", "");
      var registros = limpieza.substring(limpieza.indexOf("{"), limpieza.lastIndexOf("}") + 1);
      jo.data = JSON.parse("" + registros);
      jo.message = "Exito";
      jo.status = "0"
    } else {
      jo.status = "1"
      jo.message = "Ups no responde Chat GPT " + respuesta.message;
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}

export async function cierreNotificacionChatgpt(jsonanalizar, _conversaciones, configuracion) {
  var jo = {};
  try {
    var historial = "De la siguiente conversacion analizar: \n\n";
    if (_conversaciones.length > 0) {
      for (var il = 0; il < _conversaciones.length; il++) {
        if (_conversaciones[il].mensaje_entrada) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_entrada + "\n";
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida_2 + "\n";
        }
        if (_conversaciones[il].mensaje_entrada_2) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_entrada_2 + "\n";
        }
        if (_conversaciones[il].mensaje_salida) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida + "\n";
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial += "El Vendedor dice " + _conversaciones[il].mensaje_salida_2 + "\n";
        }
        if (_conversaciones[il].mensaje_configuracion) {
          historial += "El cliente dice " + _conversaciones[il].mensaje_configuracion + "\n";
        }
        if (_conversaciones[il].mensaje_entrada_imagen) {
          historial += "El cliente dice URL IMAGEN es" + _conversaciones[il].mensaje_entrada_imagen + "\n";
        }
      }
    }
    var payload = { "messages": [{ "role": "system", "content": jsonanalizar }, { "role": "user", "content": historial }], "model": (configuracion.model ? configuracion.model : "gpt-4o"), "temperature": 0, "max_tokens": 2048, "presence_penalty": 0, "frequency_penalty": 0, "top_p": 1, "stop": "\\n" };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': 'Bearer ' + (configuracion.token ? configuracion.token : configuracion.token_chatgpt),
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };

    //console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log(JSON.stringify(respuesta));
    if (respuesta.status == "0" && respuesta.data.choices && respuesta.data.choices[0].message && respuesta.data.choices[0].message.content) {
      var limpieza = ("" + respuesta.data.choices[0].message.content).trim();//.replaceAll("\n","").replaceAll("\", "");
      var registros = limpieza.substring(limpieza.indexOf("{"), limpieza.lastIndexOf("}") + 1);
      jo.data = JSON.parse("" + registros);
      jo.message = "Exito";
      jo.status = "0"
    } else {
      jo.status = "1"
      jo.message = "Ups no responde Chat GPT " + respuesta.message;
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}
export async function eventoNotificacionQwen(_items, _conversaciones, configuracion) {
  var jo = {};
  try {
    var historial = [{ "role": "system", "content": configuracion.entrenamiento }];
    if (configuracion.entrenamiento_adicional) {
      historial.push({ "role": "system", "content": configuracion.entrenamiento_adicional });
    }
    //console.log("_conversaciones", JSON.stringify(_conversaciones));
    if (_conversaciones.length > 0) {
      for (var il = 0; il < _conversaciones.length; il++) {
        if (_conversaciones[il].mensaje_configuracion) {
          historial.push({ "role": "system", "content": _conversaciones[il].mensaje_configuracion });
        }
        if (_conversaciones[il].mensaje_entrada) {
          historial.push({ "role": "user", "content": _conversaciones[il].mensaje_entrada });
        }
        if (_conversaciones[il].mensaje_salida) {
          historial.push({ "role": "assistant", "content": _conversaciones[il].mensaje_salida });
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial.push({ "role": "assistant", "content": _conversaciones[il].mensaje_salida_2 });
        }
      }
    }
    
    for (var il = 0; il < _items.length; il++) {
      historial.push({ "role": _items[il].role, "content": _items[il].content });
    }
    var payload = { "messages": historial, "model": (configuracion.model ? configuracion.model : "qwen-plus") };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
      headers: {
        'Authorization': 'Bearer ' + (configuracion.token ? configuracion.token : configuracion.token_chatgpt),
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };
    //console.log("POSTMANE::::"+JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log("SALIDAA::::::"+JSON.stringify(respuesta));
    if (respuesta.status == "0" && respuesta.data.choices && respuesta.data.choices[0].message && respuesta.data.choices[0].message.content) {
      var mensaje_chat = (respuesta.data.choices[0].message.content + "").replaceAll("**", "*");
      if (mensaje_chat.substring(0, 2) == "\n\n") {
        mensaje_chat = mensaje_chat.substring(2, mensaje_chat.length);
      } else if (mensaje_chat.substring(0, 1) == "\n") {
        mensaje_chat = mensaje_chat.substring(1, mensaje_chat.length);
      }
      jo.message = mensaje_chat;
      jo.status = "0";
    } else {
      jo.status = "1";
      jo.message = "Ups no responde Chat GPT " + respuesta.message;
    }
  } catch (e) {
    //console.log("eeeeeeeeeeee"+e);
    jo.status = '-1';
    jo.message = e.toString();
  }
  console.log(jo);
  return jo;
}

export async function eventoNotificacionDeepseek(_items, _conversaciones, configuracion) {
  var jo = {};
  try {
    var historial = [{ "role": "system", "content": configuracion.entrenamiento }];
    if (configuracion.entrenamiento_adicional) {
      historial.push({ "role": "system", "content": configuracion.entrenamiento_adicional });
    }
    //console.log("_conversaciones", JSON.stringify(_conversaciones));
    if (_conversaciones.length > 0) {
      for (var il = 0; il < _conversaciones.length; il++) {
        if (_conversaciones[il].mensaje_configuracion) {
          historial.push({ "role": "system", "content": _conversaciones[il].mensaje_configuracion });
        }
        if (_conversaciones[il].mensaje_entrada) {
          historial.push({ "role": "user", "content": _conversaciones[il].mensaje_entrada });
        }
        if (_conversaciones[il].mensaje_salida) {
          historial.push({ "role": "assistant", "content": _conversaciones[il].mensaje_salida });
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial.push({ "role": "assistant", "content": _conversaciones[il].mensaje_salida_2 });
        }
      }
    }
    for (var il = 0; il < _items.length; il++) {
      historial.push({ "role": _items[il].role, "content": _items[il].content });
    }
    var payload = { "stream": false, "messages": historial, "model": "deepseek-chat" };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Authorization': 'Bearer ' + configuracion.token_chatgpt,
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };
    //console.log("POSTMANE::::"+JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log("SALIDAA::::::"+JSON.stringify(respuesta));
    if (respuesta.status == "0" && respuesta.data.choices && respuesta.data.choices[0].message && respuesta.data.choices[0].message.content) {
      var mensaje_chat = (respuesta.data.choices[0].message.content + "").replaceAll("**", "*");
      if (mensaje_chat.substring(0, 2) == "\n\n") {
        mensaje_chat = mensaje_chat.substring(2, mensaje_chat.length);
      } else if (mensaje_chat.substring(0, 1) == "\n") {
        mensaje_chat = mensaje_chat.substring(1, mensaje_chat.length);
      }
      jo.message = mensaje_chat;
      jo.status = "0";
    } else {
      jo.status = "1";
      jo.message = "Ups no responde Chat GPT " + respuesta.message;
    }
  } catch (e) {
    //console.log("eeeeeeeeeeee"+e);
    jo.status = '-1';
    jo.message = e.toString();
  }
  console.log(jo);
  return jo;
}

export async function eventoNotificacionChatgpt(_items, _conversaciones, configuracion) {
  var jo = {};
  //console.log("eventoNotificacionChatgpt")
  try {
    var historial = [{ "role": "system", "content": configuracion.entrenamiento }];
    if (configuracion.entrenamiento_adicional) {
      historial.push({ "role": "system", "content": configuracion.entrenamiento_adicional });
    }
    //console.log("_conversaciones", JSON.stringify(_conversaciones));
    if (_conversaciones.length > 0) {
      for (var il = 0; il < _conversaciones.length; il++) {
        if (_conversaciones[il].mensaje_configuracion) {
          historial.push({ "role": "system", "content": _conversaciones[il].mensaje_configuracion });
        }
        if (_conversaciones[il].mensaje_entrada) {
          historial.push({ "role": "user", "content": _conversaciones[il].mensaje_entrada });
        }
        if (_conversaciones[il].mensaje_entrada_imagen) {
          historial.push({ "role": "user", "content": [{ "type": "text", "text": _conversaciones[il].mensaje_entrada }, { "type": "image_url", "image_url": { "url": _conversaciones[il].mensaje_entrada_imagen } }] });
        }
        if (_conversaciones[il].mensaje_salida) {
          historial.push({ "role": "assistant", "content": _conversaciones[il].mensaje_salida });
        }
        if (_conversaciones[il].mensaje_salida_2) {
          historial.push({ "role": "assistant", "content": _conversaciones[il].mensaje_salida_2 });
        }
      }
    }
    for (var il = 0; il < _items.length; il++) {
      historial.push({ "role": _items[il].role, "content": _items[il].content });
    }
    var payload = { "messages": historial, "model": (configuracion.model ? configuracion.model : "gpt-4o"), "temperature": parseFloat("0"), "max_tokens": (configuracion.max_tokens ? parseInt(configuracion.max_tokens) : parseInt("2048")), "presence_penalty": parseFloat("0"), "frequency_penalty": parseFloat("0"), "top_p": parseFloat("1"), "stop": "" };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Authorization': 'Bearer ' + (configuracion.token ? configuracion.token : configuracion.token_chatgpt),
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };
    console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    console.log(JSON.stringify(respuesta));
    if (respuesta.status == "0" && respuesta.data.choices && respuesta.data.choices[0].message && respuesta.data.choices[0].message.content) {
      var mensaje_chat = (respuesta.data.choices[0].message.content + "").replaceAll("**", "*");
      if (mensaje_chat.substring(0, 2) == "\n\n") {
        mensaje_chat = mensaje_chat.substring(2, mensaje_chat.length);
      } else if (mensaje_chat.substring(0, 1) == "\n") {
        mensaje_chat = mensaje_chat.substring(1, mensaje_chat.length);
      }
      jo.message = mensaje_chat;
      jo.status = "0";
      if (configuracion.token == "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" && (mensaje_chat.includes("123456789") || mensaje_chat.includes("0000000000"))) {
        console.log("JSONNNNN ERRROROROR CBU  ", JSON.stringify(config), JSON.stringify(respuesta));
      }
    } else {
      jo.status = "1";
      jo.message = "Ups no responde Chat GPT " + respuesta.message;
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}
export async function eventoAsistenteChatgpt(webhook, identificador, nunmero, estado, thread, mensaje, configuracion, tipo_adicional, id_adicional) {
  //console.log("xxxxx");
  var jo = {};
  try {
    if (!thread) {
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/threads',
        headers: {
          'Authorization': 'Bearer ' + configuracion.token_chatgpt,
          'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        data: ""
      };
      //console.log("'https://api.openai.com/v1/threads'", JSON.stringify(config));
      var respuesta = await axios.request(config)
        .then((response) => {
          return { status: "0", message: "OK", data: response.data }
        })
        .catch((error) => {
          return { status: "1", message: error, data: {} }
        });
      //console.log("'https://api.openai.com/v1/threads'", JSON.stringify(respuesta));
      if (respuesta.status == "0" && respuesta.data.id) {
        thread = respuesta.data.id;
      }
    }
    //console.log("thread" + thread);
    if (thread) {
      // se crea el mensaje enn el hilo
      var contenidos = [];
      if (tipo_adicional == "imagen" && id_adicional) {
        contenidos.push({
          "type": "image_file", "image_file": {
            "file_id": id_adicional
          }
        });
      }
      contenidos.push({ "type": "text", "text": mensaje });

      var config_msj = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/threads/' + thread + '/messages',
        headers: {
          'Authorization': 'Bearer ' + configuracion.token_chatgpt,
          'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          "role": "user",
          "content": contenidos//mensaje
        })
      };
      //console.log('1) https://api.openai.com/v1/threads/' + thread + '/messages', JSON.stringify(config_msj));
      var respuesta_msj = await axios.request(config_msj)
        .then((response) => {
          return { status: "0", message: "OK", data: response.data }
        })
        .catch((error) => {
          return { status: "1", message: error, data: {} }
        });
      //console.log('1) https://api.openai.com/v1/threads/' + thread + '/messages', JSON.stringify(respuesta_msj));
      if (respuesta_msj.status == "0") {

        let config_iniciar = {
          method: 'post',
          maxBodyLength: Infinity,
          url: 'https://api.openai.com/v1/threads/' + thread + '/runs',
          headers: {
            'Authorization': 'Bearer ' + configuracion.token_chatgpt,
            'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
            'accept': 'application/json',
            'content-type': 'application/json'
          },
          data: JSON.stringify({
            "assistant_id": configuracion.asistente_chatgpt
          })
        };
        //console.log('2) https://api.openai.com/v1/threads/' + thread + '/runs', JSON.stringify(config_iniciar));
        var respuesta_iniciar = await axios.request(config_iniciar)
          .then((response) => {
            return { status: "0", message: "OK", data: response.data }
          })
          .catch((error) => {
            return { status: "1", message: error, data: {} }
          });
        //console.log('2) https://api.openai.com/v1/threads/' + thread + '/runs', JSON.stringify(respuesta_iniciar));
        if (respuesta_iniciar.status == "0" && respuesta_iniciar.data.id) {
          var maximoespera = 21;
          if (configuracion.maximoesperaseg) {
            maximoespera = parseInt(configuracion.maximoesperaseg / 2);
          }
          for (var il = 0; il < maximoespera; il++) {
            await sleep(3000);
            // se pregunta a la tarea si depede una respuesta previa o no
            let config_run_estado = {
              method: 'get',
              maxBodyLength: Infinity,
              url: 'https://api.openai.com/v1/threads/' + thread + '/runs/' + respuesta_iniciar.data.id,
              headers: {
                'Authorization': 'Bearer ' + configuracion.token_chatgpt,
                'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
                'accept': 'application/json',
                'content-type': 'application/json'
              },
              data: ""
            };
            //console.log('3) https://api.openai.com/v1/threads/' + thread + '/runs/' + respuesta_iniciar.data.id, JSON.stringify(config_run_estado));
            var respuesta_run_estado = await axios.request(config_run_estado)
              .then((response) => {
                return { status: "0", message: "OK", data: response.data }
              })
              .catch((error) => {
                return { status: "1", message: error, data: {} }
              });
            //console.log('3) https://api.openai.com/v1/threads/' + thread + '/runs/' + respuesta_iniciar.data.id, JSON.stringify(respuesta_run_estado));
            if (respuesta_run_estado.status == "0" && respuesta_run_estado.data.required_action && respuesta_run_estado.data.required_action.submit_tool_outputs) {
              console.log("IDDDDD" + respuesta_run_estado.data.required_action.submit_tool_outputs.tool_calls[0].function.arguments)
              var respuesta_call = await grabrasolicitudesapi(webhook, identificador, nunmero, estado, JSON.parse(respuesta_run_estado.data.required_action.submit_tool_outputs.tool_calls[0].function.arguments));
              console.log("respuesta_call", JSON.stringify(respuesta_call));
              let config_notificar = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://api.openai.com/v1/threads/' + thread + '/runs/' + respuesta_iniciar.data.id + '/submit_tool_outputs',
                headers: {
                  'Authorization': 'Bearer ' + configuracion.token_chatgpt,
                  'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
                  'accept': 'application/json',
                  'content-type': 'application/json'
                },
                data: JSON.stringify({
                  "tool_outputs": [
                    {
                      "tool_call_id": respuesta_run_estado.data.required_action.submit_tool_outputs.tool_calls[0].id,
                      "output": respuesta_call.data.message
                    }
                  ]
                })
              };
              console.log(JSON.stringify(config_notificar));
              var respuesta_notificar = await axios.request(config_notificar)
                .then((response) => {
                  return { status: "0", message: "OK", data: response.data }
                })
                .catch((error) => {
                  return { status: "1", message: error, data: {} }
                });
              console.log(JSON.stringify(respuesta_notificar));
              await sleep(1000);
            }
            let config_resultado = {
              method: 'get',
              maxBodyLength: Infinity,
              url: 'https://api.openai.com/v1/threads/' + thread + '/messages?run_id=' + respuesta_iniciar.data.id,
              headers: {
                'Authorization': 'Bearer ' + configuracion.token_chatgpt,
                'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
                'accept': 'application/json',
                'content-type': 'application/json'
              },
              data: ""
            };
            //console.log("4) " + JSON.stringify(config_resultado));
            var respuesta_resultado = await axios.request(config_resultado)
              .then((response) => {
                return { status: "0", message: "OK", data: response.data }
              })
              .catch((error) => {
                return { status: "1", message: error, data: {} }
              });
            //console.log("4) " + JSON.stringify(respuesta_resultado));
            if (respuesta_resultado.status == "0" && respuesta_resultado.data.data && respuesta_resultado.data.data[0] && respuesta_resultado.data.data[0].content[0]
              && respuesta_resultado.data.data[0].content[0].text
            ) {
              jo.status = '0';
              jo.message = respuesta_resultado.data.data[0].content[0].text.value;
              jo.hilo = thread;
              jo.usotoken = 0;
              break;
            } else {
              jo.status = '1';
              jo.message = "No se obtuvo la respuesta";
            }
          }
        } else {
          jo.status = '1';
          jo.message = "No se puede iniciar el proceso";
        }
      } else {
        jo.status = '1';
        jo.message = "No se puede crear el mensajes";
      }
    } else {
      jo.status = '1';
      jo.message = "No se puede crear el hilo";
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}

function extractFieldsFromStream(text) {
  try {
    // Extraer el ID principal del objeto
    const idMatch = text.match(/"id":"(run_[^"]+)"/);
    if (!idMatch) throw new Error("ID principal no encontrado");

    const mainId = idMatch[1];

    const toolCallsStart = text.indexOf('"tool_calls":');
    if (toolCallsStart === -1) throw new Error("Estructura de datos no encontrada");

    // Inicia buscando desde la ubicación de "tool_calls":
    const toolCallsSubString = text.substring(toolCallsStart);
    const firstBracket = toolCallsSubString.indexOf('[');
    const lastBracket = toolCallsSubString.indexOf(']') + 1;

    if (firstBracket === -1 || lastBracket === -1) throw new Error("Estructura de 'tool_calls' incorrecta");

    const toolCallsArrayString = toolCallsSubString.substring(firstBracket, lastBracket);
    const toolCallsArray = JSON.parse(toolCallsArrayString);

    const firstToolCall = toolCallsArray[0];

    const toolCallId = firstToolCall.id;
    const dataCalls = firstToolCall.function.arguments;

    return {
      mainId,
      toolCallId,
      dataCalls
    };
  } catch (error) {
    console.error("Error al extraer campos:", error.message);
    return "";
  }
}


export async function eventoAsistenteChatgptStream(
  webhook,
  thread,
  mensaje,
  configuracion,
  tipo_adicional,
  id_adicional,
  numero,
  identificador,
  estado,
  inicializarsystemsistente,
  eliminarultimomensajetarea
) {
  //console.log("Iniciando eventoAsistenteChatgptStream..." + webhook+" eliminarultimomensajetarea "+eliminarultimomensajetarea);
  var jo = { status: "-1", message: "No existe data inicial", mensaje_salida: "No existe data inicial" };
  try {
    if (!thread) {
      // Crear un nuevo hilo si no existe uno
      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://api.openai.com/v1/threads",
        headers: {
          Authorization: "Bearer " + configuracion.token_chatgpt,
          "OpenAI-Beta": "assistants=" + configuracion.version_chatgpt,
          accept: "application/json",
          "content-type": "application/json",
        },
        data: "",
      };
      //console.log("Solicitando nuevo hilo:", JSON.stringify(config));
      const respuesta = await axios.request(config)
        .then(response => ({ status: "0", message: "OK", data: response.data }))
        .catch(error => ({ status: "1", message: error, data: {} }));
      //console.log("Respuesta de nuevo hilo:", JSON.stringify(respuesta));
      if (respuesta.status === "0" && respuesta.data.id) {
        thread = respuesta.data.id;
        eliminarultimomensajetarea = false;
      }
    }

    if (thread) {
      // procedermos a listar y eliminar tareas
      if (eliminarultimomensajetarea == true) {
        try {
          let config_run = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://api.openai.com/v1/threads/' + thread + '/runs',
            headers: {
              'Authorization': 'Bearer ' + configuracion.token_chatgpt,
              'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
              'accept': 'application/json',
              'content-type': 'application/json'
            },
            data: ""
          };
          //console.log("RUN " + JSON.stringify(config_run));
          var respuesta_runs = await axios.request(config_run)
            .then((response) => {
              return { status: "0", message: "OK", data: response.data }
            })
            .catch((error) => {
              return { status: "1", message: error, data: {} }
            });
          //console.log("LISTADO DE RUNS")
          if (respuesta_runs.status == "0" && respuesta_runs.data.data.length > 0) {
            var evento_start_inicio = respuesta_runs.data.data.find((item) => item.status === "in_progress");
            if (evento_start_inicio) {
              // se cancela la tarea
              const tareas_cancelar = {
                method: "post",
                maxBodyLength: Infinity,
                url: `https://api.openai.com/v1/threads/${thread}/runs/${evento_start_inicio.id}/cancel`,
                headers: {
                  Authorization: "Bearer " + configuracion.token_chatgpt,
                  "OpenAI-Beta": "assistants=" + configuracion.version_chatgpt,
                  accept: "application/json",
                  "content-type": "application/json",
                },
                data: "",
              };
              //console.log("Enviando cancelando:", JSON.stringify(tareas_cancelar));
              const respuesta_cancelartarea = await axios.request(tareas_cancelar)
                .then(response => ({ status: "0", message: "OK", data: response.data }))
                .catch(error => ({ status: "1", message: error, data: {} }));
              //console.log("Respuesta de cancelando:", JSON.stringify(respuesta_cancelartarea));
            }
          }
        } catch (error) {
          //console.log("ERRORROROR "+error);
        }
      }
      // Crear el mensaje en el hilo existente
      //console.log("inicializarsystemsistente::::::."+inicializarsystemsistente);
      if (inicializarsystemsistente) {
        const config_msj_asistente = {
          method: "post",
          maxBodyLength: Infinity,
          url: `https://api.openai.com/v1/threads/${thread}/messages`,
          headers: {
            Authorization: "Bearer " + configuracion.token_chatgpt,
            "OpenAI-Beta": "assistants=" + configuracion.version_chatgpt,
            accept: "application/json",
            "content-type": "application/json",
          },
          data: JSON.stringify({ role: "user", content: [{ type: "text", text: inicializarsystemsistente }] }),
        };
        //console.log("Enviando mensaje:", JSON.stringify(config_msj_asistente));
        const respuesta_msj_asistente = await axios.request(config_msj_asistente)
          .then(response => ({ status: "0", message: "OK", data: response.data }))
          .catch(error => ({ status: "1", message: error, data: {} }));
        //console.log("Respuesta de mensaje:", JSON.stringify(respuesta_msj_asistente));
      }
      if (mensaje == "!SOLO_ENVIO!") {
        jo.status = "1";
        jo.message = "Se notifico al asistente";
        return jo;
      }
      var contenidos = [];
      if (tipo_adicional === "imagen" && id_adicional) {
        contenidos.push({
          type: "image_file",
          image_file: { file_id: id_adicional },
        });
      } else if (tipo_adicional === "imagenurl" && id_adicional) {
        contenidos.push({
          type: "image_url",
          image_url: { url: id_adicional },
        });
      }
      contenidos.push({ type: "text", text: mensaje });
      const config_msj = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://api.openai.com/v1/threads/${thread}/messages`,
        headers: {
          Authorization: "Bearer " + configuracion.token_chatgpt,
          "OpenAI-Beta": "assistants=" + configuracion.version_chatgpt,
          accept: "application/json",
          "content-type": "application/json",
        },
        data: JSON.stringify({ role: "user", content: contenidos }),
      };
      //console.log("Enviando mensaje:", JSON.stringify(config_msj));
      const respuesta_msj = await axios.request(config_msj)
        .then(response => ({ status: "0", message: "OK", data: response.data }))
        .catch(error => ({ status: "1", message: error, data: {} }));

      //console.log("Respuesta de mensaje:", JSON.stringify(respuesta_msj));

      if (respuesta_msj.status === "0") {
        // Iniciar el proceso de Asistente de ChatGPT con streaming
        const response = await axios({
          method: "POST",
          url: `https://api.openai.com/v1/threads/${thread}/runs`,
          headers: {
            Authorization: "Bearer " + configuracion.token_chatgpt,
            "OpenAI-Beta": "assistants=" + configuracion.version_chatgpt,
            "content-type": "application/json",
            accept: "text/event-stream",
          },
          data: JSON.stringify({
            assistant_id: configuracion.asistente_chatgpt,
            stream: true,
            tool_choice: null,
          }),
          responseType: "stream",
        });

        // Procesamiento del flujo de datos
        await new Promise((resolve, reject) => {
          response.data.on("data", async (chunk) => {
            const lines = chunk.toString().trim().split("\n");
            for (const line of lines) {
              if (line.startsWith("data:")) {
                try {
                  // se asigna a un valor
                  var datalinea = line.replace('data: ', '').trim();
                  // pregunto en caso sea call function
                  if ((datalinea + "").includes("requires_action") && (datalinea + "").includes("submit_tool_outputs") && (datalinea + "").includes("tool_calls")) {
                    jo.status = "2";
                    jo.message = "EN PROCESO";
                    jo.mensaje_salida = jo.message;
                    jo.data_calls = datalinea;
                  }
                  const jsonData = JSON.parse(datalinea);
                  //                  console.log("Data recibida:", JSON.stringify(jsonData));
                  /*if (jsonData.status === "requires_action" && jsonData.required_action.submit_tool_outputs) {
                    // Acción requerida: enviar los resultados de la herramienta
                    jo.status = "2";
                    jo.message = "EN PROCESO";
                    jo.mensaje_salida=jo.message;
                    jo.data_calls = JSON.parse(jsonData.required_action.submit_tool_outputs.tool_calls[0].function.arguments);
                    jo.tool_calls = jsonData.required_action.submit_tool_outputs.tool_calls[0].id;
                  } else*/
                  if (jsonData.status === "completed" && jsonData.content?.[0]?.text) {
                    // Mensaje completado
                    jo.status = "0";
                    jo.message = jsonData.content[0].text.value;
                    jo.mensaje_salida = jo.message;
                    jo.hilo = thread;
                    //                  console.log("Mensaje completado:", jsonData);
                  } else if (jsonData.status === "completed" && jsonData.usage) {
                    // Uso del token al completar
                    jo.usotoken = jsonData.usage.total_tokens;
                    response.data.destroy();
                    resolve();
                  }
                } catch (err) {
                  //                  console.error("Error al parsear data:", line, err);
                }
              }
            }
          });
          response.data.on("end", () => {
            //console.log("Conexión cerrada");
            resolve();
          });
          response.data.on("error", (err) => {
            console.error("Error en el stream:", err);
            reject(err);
          });
        });
        if (jo.status == "2" && jo.data_calls) {
          //console.log("INGRESO 11", JSON.stringify(jo) + "-----" + runsid);
          var data_calls = "";
          var tool_call_id = "";
          var runsid = "";
          try {
            var jsonDataV = JSON.parse(jo.data_calls);
            //console.log("Data recibida data_calls:", JSON.stringify(jsonDataV));
            data_calls = JSON.parse(jsonDataV.required_action.submit_tool_outputs.tool_calls[0].function.arguments);
            tool_call_id = jsonDataV.required_action.submit_tool_outputs.tool_calls[0].id;
            runsid = jsonDataV.id;
          } catch (error) {
            //console.log("ERROR PARSE CALL ACTION"+error);
            var extractFieldsFrom = await extractFieldsFromStream(jo.data_calls);
            if (extractFieldsFrom) {
              data_calls = JSON.parse(extractFieldsFrom.dataCalls),
                tool_call_id = extractFieldsFrom.toolCallId;
              runsid = extractFieldsFrom.mainId;
            }
          }
          //console.log(" se termino :::: tool_call_id" +tool_call_id+" data_calls  "+data_calls+" data runsid "+runsid);

          if (tool_call_id && data_calls && runsid) {
            const respuesta_call = await grabrasolicitudesapi(
              webhook,
              identificador,
              numero,
              estado,
              data_calls
            );
            //console.log("INGRESO 11", JSON.stringify(respuesta_call));
            const config_notificar = {
              method: "post",
              maxBodyLength: Infinity,
              url: `https://api.openai.com/v1/threads/${thread}/runs/${runsid}/submit_tool_outputs`,
              headers: {
                Authorization: "Bearer " + configuracion.token_chatgpt,
                "OpenAI-Beta": "assistants=" + configuracion.version_chatgpt,
                accept: "application/json",
                "content-type": "application/json",
              },
              data: JSON.stringify({
                tool_outputs: [
                  {
                    tool_call_id: tool_call_id,
                    output: respuesta_call.data.message,
                  },
                ],
              }),
            };
            const respuesta_callout = await axios.request(config_notificar)
              .then(response => ({ status: "0", message: "OK", data: response.data }))
              .catch(error => ({ status: "1", message: error, data: {} }));
            //console.log("Continuando después de acción requerida", JSON.stringify(respuesta_callout));
            if (respuesta_call.status == "0") {
              var maximoespera = 21;// 12 segundos maximo
              if (configuracion.maximoesperaseg) {
                maximoespera = parseInt(configuracion.maximoesperaseg / 3);
              }
              console.log("TIEMPOTIEMPOTIEMPOTIEMPO" + identificador + "-" + maximoespera);
              for (var il = 0; il < maximoespera; il++) {
                await sleep(3000);
                let config_resultado = {
                  method: 'get',
                  maxBodyLength: Infinity,
                  url: 'https://api.openai.com/v1/threads/' + thread + '/messages?run_id=' + runsid,
                  headers: {
                    'Authorization': 'Bearer ' + configuracion.token_chatgpt,
                    'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
                    'accept': 'application/json'
                  },
                  data: ""
                };
                console.log("4" + identificador + "..." + JSON.stringify(config_resultado));
                var respuesta_resultado = await axios.request(config_resultado)
                  .then((response) => {
                    return { status: "0", message: "OK", data: response.data }
                  })
                  .catch((error) => {
                    return { status: "1", message: error, data: {} }
                  });
                console.log("4" + identificador + "..." + JSON.stringify(respuesta_resultado));
                if (respuesta_resultado.status == "0" && respuesta_resultado.data.data && respuesta_resultado.data.data[0] && respuesta_resultado.data.data[0].content[0]
                  && respuesta_resultado.data.data[0].content[0].text
                ) {
                  jo.status = '0';
                  jo.message = respuesta_resultado.data.data[0].content[0].text.value;
                  jo.mensaje_salida = jo.message;
                  jo.hilo = thread;
                  jo.usotoken = 0;
                  jo.call_action = respuesta_call.data.call_action;
                  break;
                } else {
                  jo.status = '1';
                  jo.message = "No se obtuvo la respuesta";
                  jo.mensaje_salida = jo.message;
                }
              }
            }
          }
        }
        if (jo.status !== "0") {
          jo.status = "1";
          jo.message = "No existe respuesta del asistente";
          jo.mensaje_salida = jo.message;
        }
      } else {
        jo.status = "1";
        jo.message = "No se puede crear el mensaje";
        jo.mensaje_salida = jo.message;
      }
    } else {
      jo.status = "1";
      jo.message = "No se puede crear el hilo";
      jo.mensaje_salida = jo.message;
    }
  } catch (e) {
    jo.status = "-1";
    jo.message = e.toString();
    jo.mensaje_salida = jo.message;
  }
  return jo;
}

export async function eventoAsistenteChatgptStream111(webhook, thread, mensaje, configuracion, tipo_adicional, id_adicional, numero) {

  //console.log("iniciiiii");
  var jo = { "status": "-1", "message": "No existe data 2" };
  try {
    if (!thread) {
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/threads',
        headers: {
          'Authorization': 'Bearer ' + configuracion.token_chatgpt,
          'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        data: ""
      };
      //console.log("'https://api.openai.com/v1/threads'", JSON.stringify(config));
      var respuesta = await axios.request(config)
        .then((response) => {
          return { status: "0", message: "OK", data: response.data }
        })
        .catch((error) => {
          return { status: "1", message: error, data: {} }
        });
      //console.log("'https://api.openai.com/v1/threads'", JSON.stringify(respuesta));
      if (respuesta.status == "0" && respuesta.data.id) {
        thread = respuesta.data.id;
      }
    }
    if (thread) {
      // se crea el mensaje enn el hilo
      var contenidos = [];
      if (tipo_adicional == "imagen" && id_adicional) {
        contenidos.push({
          "type": "image_file", "image_file": {
            "file_id": id_adicional
          }
        });
      } else if (tipo_adicional == "imagenurl" && id_adicional) {
        contenidos.push({
          "type": "image_url", "image_url": {
            "url": id_adicional
          }
        });
      }
      contenidos.push({ "type": "text", "text": mensaje });
      var config_msj = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/threads/' + thread + '/messages',
        headers: {
          'Authorization': 'Bearer ' + configuracion.token_chatgpt,
          'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        data: JSON.stringify({
          "role": "user",
          "content": contenidos//mensaje
        })
      };
      //console.log('https://api.openai.com/v1/threads/' + thread + '/messages', JSON.stringify(config_msj));
      var respuesta_msj = await axios.request(config_msj)
        .then((response) => {
          return { status: "0", message: "OK", data: response.data }
        })
        .catch((error) => {
          return { status: "1", message: error, data: {} }
        });
      //console.log('https://api.openai.com/v1/threads/' + thread + '/messages', JSON.stringify(respuesta_msj));
      if (respuesta_msj.status == "0") {
        jo.status = '1';
        jo.message = "No se puede crear mensaje";
        const response = await axios({
          method: 'POST',
          url: 'https://api.openai.com/v1/threads/' + thread + '/runs',
          headers: {
            'Authorization': 'Bearer ' + configuracion.token_chatgpt,
            'OpenAI-Beta': 'assistants=' + configuracion.version_chatgpt,
            'content-type': 'application/json',
            'accept': 'text/event-stream',
          },
          data: JSON.stringify({
            "assistant_id": configuracion.asistente_chatgpt,
            "stream": true,
            "tool_choice": null
          }),
          responseType: 'stream'
        });

        const processData = new Promise((resolve, reject) => {
          response.data.on('data', (chunk) => {
            const lines = chunk.toString().trim().split('\n');
            lines.forEach(line => {
              if (line.startsWith('event:')) {
                // Procesa el evento aquí si es necesario
              } else if (line.startsWith('data:')) {
                try {
                  const jsonData = JSON.parse(line.replace('data: ', '').trim());
                  //console.log('Data:', JSON.stringify(jsonData));

                  if (jsonData.status == "requires_action" && jsonData.required_action.submit_tool_outputs) {



                  } else if (jsonData.status == "completed" && jsonData.content && jsonData.content[0] && jsonData.content[0].text) {
                    //                  if (line.includes("thread.run.step.completed")) {
                    jo.status = '0';
                    jo.message = jsonData.content[0].text.value;
                    jo.hilo = thread;
                    //console.log('Evento recibido:', jsonData);
                    // Terminar el stream cuando status es '0'
                    //} else if (line.includes("thread.message.completed")) {
                  } else if (jo.status == "0" && jsonData.status == "completed" && jsonData.usage) {
                    jo.usotoken = jsonData.usage.total_tokens;
                    response.data.destroy();
                    resolve();
                  }
                } catch (err) {
                  //console.log('No se pudo parsear data:', line);
                }
              }
            });
            //            console.log("SALIDAAA", JSON.stringify(jo));
          });
          response.data.on('end', () => {
            //console.log('Conexión cerrada');
            resolve();
          });
          response.data.on('error', (err) => {
            console.error('Error en el stream:', err);
            reject(err);
          });
        });
        await processData;
        if (jo.status == "0") {

        } else {
          jo.status = '1';
          jo.message = "No existe respuesta asistente";
        }
      } else {
        jo.status = '1';
        jo.message = "No se puede crear el hilo";
      }
    } else {
      jo.status = '1';
      jo.message = "No se puede crear el mensajes";
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}
export async function obtenerurlaudiotowhisper(url, token_chatgot) {
  var jo = { status: "-1", message: "OK", data: { texto: "Hola" } }
  try {
    var respuesta_meta = await utils.getbuffer_api(url, "");
    if (respuesta_meta.status == "0") {
      jo = await obteneraudiobase64towhisper("ogg", respuesta_meta.data.base, token_chatgot);
    } else {
      jo = { status: "1", message: "No existe audio en meta" }
    }
  } catch (e) {
    //console.log(e);
    jo = { status: "-1", message: e }
  }
  return jo;
}
export async function obteneraudiobase64towhisper(exts, base64, token_chatgot) {
  var jo = { status: "-1", message: "Errror" };
  var respuesta_ogg_mp3 = await convertir_ogg_mp3(exts, base64);
  //console.log(JSON.stringify(respuesta_ogg_mp3));
  if (respuesta_ogg_mp3.status == "0") {
    var jo_notificacion_audio = await convertir_audio_whisper(respuesta_ogg_mp3.base64, respuesta_ogg_mp3.nombrearchivo, token_chatgot);
    //console.log(JSON.stringify(jo_notificacion_audio));
    if (jo_notificacion_audio.status == "0") {
      jo = { status: "0", message: jo_notificacion_audio.message }
    } else {
      jo = { status: "1", message: "No se puede obtener texto enn whisper" }
    }
  } else {
    jo = { status: "1", message: "No se puede convertir de ogg a mp3" }
  }
  return jo;
}

export async function chatgpt_subir_archivo(_archivo, nombrearchivo, token) {
  var jo = {};
  try {
    let data = new FormData();
    data.append('purpose', 'vision');
    var bufferValue = await Buffer.from(_archivo, "base64");
    data.append('file', bufferValue, nombrearchivo);
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.openai.com/v1/files',
      headers: {
        'Authorization': 'Bearer ' + token,
        ...data.getHeaders()
      },
      data: data
    };
    //console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log("chatgpt_subir_archivo"+JSON.stringify(respuesta));
    if (respuesta.status == "0") {
      jo.fileid = respuesta.data.id;
      jo.message = "OK";
      jo.status = "0";
    } else {
      jo.status = "1"
      jo.message = "Ups no responde chagpt ";
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = "ERROR " + e.toString();
  }
  //console.log(jo);
  return jo;
}

export async function convertir_audio_whisper(_archivo, nombrearchivo, token) {
  var jo = {};
  try {
    let data = new FormData();
    data.append('model', 'whisper-1');
    var bufferValue = await Buffer.from(_archivo, "base64");
    data.append('file', bufferValue, nombrearchivo);
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://api.openai.com/v1/audio/transcriptions',
      headers: {
        'Authorization': 'Bearer ' + token,
        ...data.getHeaders()
      },
      data: data
    };
    //console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log(JSON.stringify(respuesta));
    if (respuesta.status == "0") {
      jo.message = respuesta.data.text;
      jo.status = "0";
    } else {
      jo.status = "1"
      jo.message = "Ups no responde Wispher ";
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = "ERROR " + e.toString();
  }
  //console.log(jo);
  return jo;
}

export async function convertir_ogg_mp3(extension, base64) {
  var jo = {};
  try {
    var salidaarchivo = new Date().getTime() + ".mp3";
    var payload = {
      "nombrearchivo": new Date().getTime() + "." + extension,
      "nombrearchivosalida": salidaarchivo,
      "base64": base64
    };
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: (process.env.API_AUDIO ? process.env.API_AUDIO : "https://" + process.env.API_REST + ".execute-api." + process.env.API_REGION + ".amazonaws.com/dev/ffmpeg/subir"),
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json'
      },
      data: JSON.stringify(payload)
    };
    //console.log(JSON.stringify(config));
    var respuesta = await axios.request(config)
      .then((response) => {
        return { status: "0", message: "OK", data: response.data }
      })
      .catch((error) => {
        return { status: "1", message: error, data: {} }
      });
    //console.log(JSON.stringify(respuesta));
    if (respuesta.status == "0") {
      jo.message = "Exito";
      jo.status = "0";
      jo.base64 = respuesta.data.base64;
      jo.nombrearchivo = salidaarchivo;
    } else {
      jo.status = "1"
      jo.message = "Ups Audio ";
    }
  } catch (e) {
    jo.status = '-1';
    jo.message = e.toString();
  }
  //console.log(jo);
  return jo;
}