import express from "express";
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import * as index from "./LMBCOMUNES/index/src/index.mjs";
//POER EL REDIS API / INDEX y utilsnegociochatgpt/UtilAPi //import 'dotenv/config'; PARA LOCAL 
// ademas cometar import * as dynamo from "../../../utilscomunes/Dynamo.mjs";
// tiee que esta apo_comunn env , luego a la misma altura las carptea LMBCOMUES / utiles
const app = express();
app.set("port", process.env.PORT || 4101);
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb', extended: true}));
app.listen(app.get("port"), () => 
  console.log("app running on port", app.get("port"))
);  
console.log("EMPEZO START");
app.post("/comunes/anlusoft", async (req, res) => {
    console.log(req.body);
    var respuesta = await index.validar({"body":JSON.stringify(req.body),path:"anlusoftredis"});
    res.send(respuesta);     
});
app.post("/decoderaudioV2", (req, res) => {
  //https://linuxize.com/post/how-to-install-ffmpeg-on-centos-7/
  let body_filtros = req.body;
  //var localizacion= "C:\\Users\\lenovo\\Downloads\\ffmpeg-master-latest-win64-gpl-shared\\ffmpeg-master-latest-win64-gpl-shared\\bin\\ffmpeg";
  var localizacion= "ffmpeg"
  //var rutaAbsolutaKeyPath = "/tmp";
  //var rutaAbsolutaKeyPath="C:\\Fuentes\\tmp";
  var rutaAbsolutaKeyPath="//home/anlusoft/tmp";
  console.log(body_filtros);
  (async () => {
    try {
      var resultado= { status: "-1", message: "OK" }
      const rutaAbsolutaKey = path.resolve(rutaAbsolutaKeyPath, body_filtros.nombrearchivo);
      const rutaAbsolutaKeySalida = path.resolve(rutaAbsolutaKeyPath, body_filtros.nombrearchivosalida);
      var comando =localizacion+' -i '+rutaAbsolutaKey+' '+rutaAbsolutaKeySalida;
      console.log(comando);
      await fs.writeFile(rutaAbsolutaKey, body_filtros.base64, 'base64', function (err) {
    //    console.log(err);
      });
      var respuesta_conversion = await new Promise((resolve, reject) => {
        exec(comando, (error, stdout, stderr) => {
          console.log("INGRESO");
          if (error) {
            resolve("ERROR"+error);
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          resolve("OK");       
        });
      });
      console.log(respuesta_conversion);
      if(respuesta_conversion=="OK"){ 
          resultado.status="0";         
          resultado.base64 = await fs.readFileSync(rutaAbsolutaKeySalida, {encoding: 'base64'});  
          if (fs.existsSync(rutaAbsolutaKey)) {
              fs.unlink(rutaAbsolutaKey, (err) => {
                  if (err) {
                      console.log(err);
                  }
              console.log('deleted'+rutaAbsolutaKey);
            })
          }
          if (fs.existsSync(rutaAbsolutaKeySalida)) {
              fs.unlink(rutaAbsolutaKeySalida, (err) => {
                  if (err) {
                      console.log(err);
                  }
              console.log('deleted'+rutaAbsolutaKeySalida);
            })
          }
      }else{
        resultado.message=respuesta_conversion;
      }  
    } catch (error) {
      console.log(error.toString());
    }
    res.send(resultado);
  })()
    .catch(err => res.sendStatus(500))
    .finally()
    ;
});