"use strict";
(function(){

	var express = require("express");
  	var router = express.Router();
  	var AWS = require('aws-sdk');
    var credentials = {accessKeyId: "AKIAI7X52L24ZQ6LDBFQ",//process.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey : "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"};//process.env.AWS_SECRET_ACCESS_KEY};
    AWS.config.credentials = credentials;
    AWS.config.region = 'us-west-2';
    var rekognition = new AWS.Rekognition({region: AWS.config.region});
	var s3 = new AWS.S3({ params: { Bucket: "testingimageproject2"}});//process.env.S3_BUCKET }});
	var db = require("../models");
	  
	var fs = require('fs-extra');

	

	


//POST END POINT WHEN USER TRIES TO LOGIN
//** NEED TO ADD VALIDATIONS : 1. IMAGE DATA IS EMPTY
//**						   2. USERNAME IS NULL/EMPTY
//**						   3. NO FACE RECOGNIZE IN IMAGE
//CHANGE THE RETURN END POINT OR CHANGE IN JPEG-CAMERA.JS TO LOAD ANOTHER PAGE OR LOGIN INFORMATION
	router.post("/api/face/login/:username",function(req,res){
		var username = req.params.username;
		var response = "";
		var imageFound = false;
		req.on("data",function(data){
			console.log("DATA on DATA ----",data);

			rekognition.searchFacesByImage(
				{
					CollectionId: username,
					FaceMatchThreshold: 0,
					Image: {
						Bytes: data
					},
					MaxFaces: 1
				},
				function(err, data) {
					if (err) {
						// res.send(err);
						imageFound = false;
						response = err.message;
						if(err.code == 'ResourceNotFoundException'){
							// res.status(404);
							res.status(400);
        					return res.end(response);

						} //END OF ERROR IF LOOP
					} 
          			else {
            			console.log("DATA === ",data);
              			var similarity = data.FaceMatches[0].Similarity;
						if ( similarity >= 80 && data.FaceMatches && data.FaceMatches.length > 0 && data.FaceMatches[0].Face ) {
							response = "Welcome "+ username;
							imageFound = true;
							res.status(200);
        					return res.end(response);

              			} else{
              				response = "Access Denied. Face Similarity : "+similarity;
							imageFound = false;
							res.status(404);
        					return res.end(response);

              			}

       			 	} //END OF OUTER ELSE LOOP
    			});//END OF FUNCTION AND SEARCHfACEBYIMAGE METHOD

		});//END OF REQUEST ON DATA LOOP

		
	}); //END OF ENDPOINT LOOP



//POST IMAGE WHEN USER SIGNS UP
//SIGNUP REQUIRES 2 STEPS--1. IT CREATES A COLLECTION WITH THE NAME OF USERNAME, 2.IT CREATES THE JSON FILE FOR THE IMAGE.S
	router.post("/api/face/signup/:username",function(req,res){
		var username = req.params.username;
		var response = "";
        // Index a dir of faces
        rekognition.createCollection({ CollectionId: username }, function(err, colData) {
          if (err) {
            console.log("createCollection error", err.message);
            if(err.code == "ResourceAlreadyExistsException"){
            	res.status(400);
            	return res.end(err.message);
            }
          } 
          else { // successful response
            console.log("createCollection success");
            console.log(colData);
		      	req.on("data",function(reqData){
					console.log("DATA on DATA ----",reqData);
			        console.log("indexFaces...");

			    
			        rekognition.indexFaces(
			            {
			              CollectionId: username,
			              DetectionAttributes: ["ALL"],
			              ExternalImageId: username,
			              Image: {
			                Bytes: reqData
			              }
			            },
			            function(err, data) {
			              if (err) {
			                console.log("indexFaces error", err.message);
			              } else {
			                console.log("indexFaces success");
			                // console.log(data);           // successful response
			                fs.writeJson(__dirname+"/../uploads/"+username + ".json", data, err => {
			                  if (err) return console.error(err);
			                });
			                res.status(200);
			                response="Successfully Signed up";
			                return res.end(response);
			              }
			            });
			    });//END OF REQUEST ON DATA

      	}
        });



		// return res.end();
	});

	//Delete user from DB/AWS/Voice
  router.delete("/api/delete/db/:username", function(req, res) {
      console.log("inside route");
      var username = req.params.username;
      

      db.User.destroy({
            where: {
              username: username
            }
        })
      .then(function(data) {
          console.log(username + " successfully deleted from DB");

         rekognition.deleteCollection({CollectionId: username}, function(err, data){
                  if(err){
                    console.log(err.message);
                } else {  
                    console.log("username: " +username+ " DeleteCollection from AWS success");
                    //Checks if file exists
                    fs.stat(__dirname+"/../uploads/"+username + ".json", function (err, stats) {

                    if (err) {
                        return console.error(err);
                    }
                      //Deletes JSON file
                     fs.unlink(__dirname+"/../uploads/"+username + ".json",function(err){
                          if(err) return console.log(err);
                          console.log(username+ '.json file deleted successfully');
                     });  
                  });
              
            }

          });//endRekognition deleteCollection
            
      });//end db delete request
      
    });//end route

	


	module.exports=router;

})();
