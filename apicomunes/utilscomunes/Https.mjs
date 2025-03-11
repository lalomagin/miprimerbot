
var headers= {
  "Access-Control-Allow-Origin": "*",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "no-referrer-when-downgrade",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block"
}

export async function obtenerevento(event) {
  var event_api = "";
  if (event.httpMethod === "POST") {
    event_api = event;
  }else if (event.body) {
      event_api = event;
  }
  return event_api;
}

export async function respuesta(payload) {
  return {
  "statusCode": 200,
  "body": JSON.stringify(payload),
  "headers": headers,
  "isBase64Encoded": false
  }
}
export async function respuestaerror(error) {
  return {
  "statusCode": 200,
  "body": JSON.stringify({
            code: -1,
            message: "Error en cath"+error,
            data: {}
        }),
  "headers": headers,
  "isBase64Encoded": false
  }
}
