/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

function main(params) {
  console.log(JSON.stringify(params, null, 2));
  if (!params.url) {
    return Promise.reject('Url parameter must be set.');
  }

  if (!params.nlu_username) {
    return Promise.reject('Watson NLU username must be set.');
  }

  if (!params.nlu_password) {
    return Promise.reject('Watson NLU password must be set.');
  }

  var nlu = new NaturalLanguageUnderstandingV1({
    username: params.nlu_username,
    password: params.nlu_password,
    version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
  });
  
  console.log('Analyzing w/Watson Natural Language Understanding');      
  
  return new Promise(function(resolve, reject) {
    nlu.analyze({
      'url': params.url,
      'features': {
        'categories': {},
        'concepts': {},
        'entities': {},
        'keywords': {},
        'emotion': {},
        'sentiment': {},
        'metadata': {},
        'relations': {},
        'semantic_roles':{}
      }
    }, function(err, response) {
       var doc = {doc: params};

       if (err) {
         console.log('error:', err);
         reject(err);
       } else {
        //console.log(JSON.stringify(response, null, 2)); 
        doc.doc.nlu = response;
        resolve(doc);
      }
    });
  });
}
