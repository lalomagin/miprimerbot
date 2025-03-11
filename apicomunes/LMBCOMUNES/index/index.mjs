import * as index from "./src/index.mjs";
import * as apihttp from "../../utilscomunes/Https.mjs";
export const handler = async event => {
    console.log(":::::",JSON.stringify(event))
    try {
        var respuesta = await index.validar(await apihttp.obtenerevento(event));
        console.log("respuesta", JSON.stringify(respuesta));
        return await apihttp.respuesta(respuesta);
    } catch (error) {
        console.log("---",error);
        return await apihttp.respuestaerror(error);
    };
};

