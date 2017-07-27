var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

function main(params) {
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
      }
    }, function(err, response) {
       if (err) {
         console.log('error:', err);
         reject(err);
       } else {
        console.log(JSON.stringify(response, null, 2)); 
        if (response.categories[0]) {
          resolve({category: response.categories[0].label.split('/',2)[1]});
        } else {
          resolve({category: 'unknown'});
        }
      }
    });
  }); //promise
}
