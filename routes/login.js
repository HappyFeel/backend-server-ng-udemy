
var express = require('express');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');

var SEED = require('../config/config').SEED;

var app= express();

var Usuario= require('../models/usuario');


//google
var CLIENT_ID = require('../config/config').CLIENT_ID;
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(CLIENT_ID);
var mdAutentication = require('../middlewares/autenticacion');
//===============================================
//  Renueva token
//===============================================
app.get('/renuevatoken', mdAutentication.verificarToken,(req,res)=>{
    var token = jwt.sign({usuario: req.usuario},SEED,{expiresIn:14400}); // 4 horas y luego expirara el token.
     res.status(200).json({
        ok:true,
        token:token
    });


});


//===============================================
//  Autenticacion de google
//===============================================
async function verify(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });
    const payload = ticket.getPayload();
    //const userid = payload['sub'];
    // If request specified a G Suite domain:
    //const domain = payload['hd'];

    return {
        nombre: payload.name,
        email: payload.email,
        img: payload.picture,
        google:true
    }
  }


app.post('/google', async (req,res)=>{


    var token = req.body.token;

    var googleUser= await verify(token)
        .catch(e=>{
            return res.status(403).json({
                ok:false,
                mensaje: 'Token no valido.'
            });


        });

    Usuario.findOne({email: googleUser.email},(err,usuarioDB)=>{
        if(err){
            return res.status(500).json({
                ok:false,
                mensaje: 'Error al buscar usuarios!',
                errors:err
            });
        }
        if (usuarioDB) {

            if (usuarioDB.google===false) {
                return res.status(400).json({
                    ok:false,
                    mensaje: 'Debe usar su autenticacion normal.'
                });
            }else{

                var token = jwt.sign({usuario: usuarioDB},SEED,{expiresIn:14400}); // 4 horas y luego expirara el token.

                res.status(200).json({
                    ok:true,
                    Usuario:usuarioDB, //U mayuscula
                    token:token,
                    id:usuarioDB.id,
                    menu:obtenerMenu(usuarioDB.role)
                });

            }
            
        }else{
            //Usuario no existe, hay que crearlo.

            var usuario= new Usuario();

            usuario.nombre= googleUser.nombre;
            usuario.email= googleUser.email;
            usuario.img= googleUser.img;
            usuario.google= true;
            usuario.password= ':)';


            usuario.save((err,usuarioDB)=>{
                var token = jwt.sign({usuario: usuarioDB},SEED,{expiresIn:14400}); // 4 horas y luego expirara el token.

                res.status(200).json({
                    ok:true,
                    Usuario:usuarioDB,
                    token:token,
                    id:usuarioDB.id,
                    menu:obtenerMenu(usuarioDB.role)
                });


            });
        }


    });



/*
    return res.status(200).json({
        ok:true,
        mensaje:"Ok",
        googleUser:googleUser
    });
    */

});




//===============================================
//  Autenticacion normal
//===============================================

app.post('/',(req,res)=>{

    var body = req.body;

    Usuario.findOne({email:body.email},(err,usuarioDB)=>{
        if(err){
            return res.status(500).json({
                ok:false,
                mensaje: 'Error al buscar usuarios!',
                errors:err
            });
        }

        if(!usuarioDB){
            return res.status(400).json({
                ok:false,
                mensaje: 'Credenciales no validas-email.',
                errors:err
            });
        }

        if(!bcrypt.compareSync(body.password, usuarioDB.password)){
            return res.status(400).json({
                ok:false,
                mensaje: 'Credenciales no validas-password.',
                errors:err
            });

        }

        //crear un token!!!


        usuarioDB.password=':)';
        var token = jwt.sign({usuario: usuarioDB},SEED,{expiresIn:14400}); // 4 horas y luego expirara el token.



        res.status(200).json({
            ok:true,
            Usuario:usuarioDB,
            token:token,
            id:usuarioDB.id,
            menu:obtenerMenu(usuarioDB.role)
        });

    });


   


});



function obtenerMenu(ROLE) {
   var menu=[
        {
          titulo:'Principal',
          icono:'mdi mdi-gauge',
          submenu:[
            {titulo:'Dashboard',url:'/dashboard'},
            {titulo:'ProgressBar',url:'/progress'},
            {titulo:'Graficas',url:'/graficas1'},
            {titulo:'Promesas',url:'/promesas'},
            {titulo:'RxJs',url:'/rxjs'}
          ]
    
    
        },
        {
          titulo:'Mantenimientos',
          icono:'mdi mdi-folder-lock-open',
          submenu:[
            //{titulo:'Usuarios',url:'/usuarios'},
            {titulo:'Hospitales',url:'/hospitales'},
            {titulo:'Medicos',url:'/medicos'}
          ]
        }
      ];

     
      if (ROLE==="ADMIN_ROLE") {
        
        menu[1].submenu.unshift({titulo:'Usuarios',url:'/usuarios'});
       
      }

      

      return menu;
}


module.exports=app;