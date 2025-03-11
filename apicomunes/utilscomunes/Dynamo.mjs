import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand,GetCommand, PutCommand,DeleteCommand,UpdateCommand} from '@aws-sdk/lib-dynamodb';
const clientdynamod = new DynamoDBClient();

export async function consulta(identificador,tabla) {
  let input = { TableName: tabla,Key: {"ID": identificador}};
  var response_ = await clientdynamod.send(new GetCommand(input));
  return response_.Item;
}
export async function eliminarPorIdIncluido(tabla, subcadenaId) {
  try {
    let itemsEliminados = 0;
    let ExclusiveStartKey = undefined; // Esta clave permite avanzar a la siguiente "página" de resultados

    do {
      // Configura el escaneo con paginación
      const scanInput = {
        TableName: tabla,
        ExclusiveStartKey,
      };

      const scanResult = await clientdynamod.send(new ScanCommand(scanInput));

      // Filtra los elementos cuyo ID contiene la subcadena
      const itemsToDelete = scanResult.Items.filter(item => item.ID.includes(subcadenaId));

      // Elimina cada elemento encontrado
      for (const item of itemsToDelete) {
        const deleteInput = {
          TableName: tabla,
          Key: { "ID": item.ID }
        };
        await clientdynamod.send(new DeleteCommand(deleteInput));
      }

      // Suma el total de elementos eliminados en esta iteración
      itemsEliminados += itemsToDelete.length;
      // Prepárate para la siguiente "página" de resultados
      ExclusiveStartKey = scanResult.LastEvaluatedKey;
    } while (ExclusiveStartKey); // Continuar mientras haya más datos
    return `${itemsEliminados} elementos eliminados.`;
  } catch (error) {
    console.error("Error al eliminar elementos:", error);
    throw new Error("No se pudo completar la operación de eliminación.");
  }
}

export async function eliminar(identificador,tabla) {
  let input = { TableName: tabla,Key: {"ID": identificador}};
  var response_ = await clientdynamod.send(new DeleteCommand(input));
  return response_.Item;
}
export async function updatecantidad(identificador, tabla, actual) {
  const input = {
    TableName: tabla,
    Key: { "ID": identificador },
    UpdateExpression: "set #actual = :actual",
    ExpressionAttributeNames: {
      "#actual": "actual"
    },
    ExpressionAttributeValues: {
      ":actual": actual,
    },
    ReturnValues: "ALL_NEW" // Opcional: para obtener el estado del elemento después de la actualización
  };
  try {
    const response_ = await clientdynamod.send(new UpdateCommand(input));
    return response_.Attributes; // Devolvemos los atributos actualizados
  } catch (error) {
    console.error("Error actualizando el cache:", error);
    throw error;
  }
}
export async function updatecache(identificador, tabla, transaccion,mensaje_buscar) {
  const input = {
    TableName: tabla,
    Key: { "ID": identificador },
    UpdateExpression: "set #transaccion = :transaccion,#mensaje_buscar=:mensaje_buscar",
    ExpressionAttributeNames: {
      "#transaccion": "transaccion", // Necesario en caso de que "cache" sea una palabra reservada o pueda provocarse una colisión
      "#mensaje_buscar": "mensaje_buscar", // Necesario en caso de que "cache" sea una palabra reservada o pueda provocarse una colisión
    },
    ExpressionAttributeValues: {
      ":transaccion": transaccion,
      ":mensaje_buscar": mensaje_buscar,
    },
    ReturnValues: "ALL_NEW" // Opcional: para obtener el estado del elemento después de la actualización
  };
  try {
    const response_ = await clientdynamod.send(new UpdateCommand(input));
    return response_.Attributes; // Devolvemos los atributos actualizados
  } catch (error) {
    console.error("Error actualizando el cache:", error);
    throw error;
  }
}

export async function insertarsinttl(payload,tabla,tiempo) {
  let input = { TableName: tabla,Item: payload};
  return await clientdynamod.send(new PutCommand(input));
}

export async function updatefacturaposicion(identificador, tabla, actual) {
  const input = {
    TableName: tabla,
    Key: { "ID": identificador },
    UpdateExpression: "set #actual = :actual",
    ExpressionAttributeNames: {
      "#actual": "actual"
    },
    ExpressionAttributeValues: {
      ":actual": actual
    },
    ReturnValues: "ALL_NEW" // Opcional: para obtener el estado del elemento después de la actualización
  };
  try {
    const response_ = await clientdynamod.send(new UpdateCommand(input));
    return response_.Attributes; // Devolvemos los atributos actualizados
  } catch (error) {
    console.error("Error actualizando el cache:", error);
    throw error;
  }
}

export async function insertarttl(payload,tabla,tiempo) {
  // minutos tiempo
  payload.fechahorattl=(Math.floor(Date.now()/1000) + tiempo*60)
  console.log(JSON.stringify(payload));
  let input = { TableName: tabla,Item: payload};
  return await clientdynamod.send(new PutCommand(input));
}
export async function insertar(payload,tabla) {
  console.log(JSON.stringify(payload));
  let input = { TableName: tabla,Item: payload};
  return await clientdynamod.send(new PutCommand(input));
}
export async function generarttl(minutos) {
  const currentTime = Date.now();
  // 30 minutos en milisegundos (30 * 60 * 1000)
  const thirtyMinutes = minutos * 60 * 1000;
  // Tiempo de expiración en milisegundos
  const expirationTimeInMilliseconds = currentTime + thirtyMinutes;
  // Convertir a segundos para DynamoDB
  return Math.floor(expirationTimeInMilliseconds / 1000);
}
