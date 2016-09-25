var fs = require('fs')
var _ = require('lodash')
var json2csv = require('json2csv')

var file = {name: '2014.csv', index: 41}

var exceptionWords = ['', 'de', 'mais', 'do', 'e', 'para', 'o', 'a', 'com', 'um', 'que', 'em', 'os', 'da', 'ser', 'ter',
'no', 'uma', 'na', 'dos', 'do', 'por', 'está', 'as', 'é', 'ou', 'das', 'ao', 'sobre', 'me', 'foi']

var casualException = ['curso', 'aula', 'cursos', 'aulas']
var lineCount = 0
var totalLineCount = 0

var wordMap = {}
var collection = []
var sinergyWordMap = {}
var sinergyWordMapFiltered = {}
var finalJsonToCsv = []

var MAX_WORDS_SINERGY = 3
var MIN_WORD_COUNT = 0.01

var GROUP_WORDS_DICTIONARY = {
  conhecimento : ['conhecimento', 'conhecimentos'],
  tecnologia : ['tecnologia', 'tecnologias'],
  novo : ['nova', 'novas', 'novos', 'novo'],
  ferramenta : ['ferramenta', 'ferramentas'],
  app : ['app', 'apps', 'aplicativo', 'aplicativos'],
  professor : ['professor', 'instrutor']
}

function replaceWordInGroup (word) {
  var replacedWord = word
  _.each(GROUP_WORDS_DICTIONARY, function(value, key) {
    if (_.some(value, function(mappedWord){ return mappedWord === word })) replacedWord = key
  })
  return replacedWord
}

function findPhrase (data, wordsToBeChecked) {

  var phrases = []
  data.forEach(function(line, index){
    if(index === 0) return

    var response = line.split(',')[file.index]
    var wordArray = response.split(' ')
    if(wordArray.length > 1 || wordArray[0] !== ''){

      wordArray = wordArray.map(function(word){
        var formattedWord = word.toLowerCase()
        if(formattedWord.indexOf('.') !== -1) formattedWord = formattedWord.replace(/\./, '')
        if(formattedWord.indexOf('"') !== -1 ) formattedWord = formattedWord.replace(/"/, '')
        return formattedWord
      })

      if (_.every(wordsToBeChecked, function(word) {
            if (GROUP_WORDS_DICTIONARY[word]){
              return _.some(GROUP_WORDS_DICTIONARY[word], function (mappedWord) {
                return wordArray.indexOf(mappedWord) !== -1
              })
            }
            return wordArray.indexOf(word) !== -1
          })
         ) {
        phrases.push(wordArray.join(' '))
      }
    }
  })

  return _.sample(phrases)
}


fs.readFile('./' + file.name, 'utf-8', function(err, data){
  data = data.split('\n')
  data.forEach(function(line, index){
    if(index === 0) return

    var response = line.split(',')[file.index]
    var wordArray = response.split(' ')
    if(wordArray.length > 1 || wordArray[0] !== ''){

      wordArray = wordArray.map(function(word){
        var formattedWord = word.toLowerCase()
        if(formattedWord.indexOf('.') !== -1) formattedWord = formattedWord.replace(/\./, '')
        if(formattedWord.indexOf('"') !== -1 ) formattedWord = formattedWord.replace(/"/, '')
        formattedWord = replaceWordInGroup(formattedWord)

        return formattedWord
      })

      var wordArrayFiltered = _.filter(wordArray, function(word){

        if(exceptionWords.indexOf(word) !== -1 || casualException.indexOf(word) !== -1) return false

        //formattedWord = groupWord(formattedWord)

        if(!wordMap[word]) wordMap[word] = {count : 0, lines : []}
        wordMap[word]['count'] += 1
        wordMap[word]['lines'].push(index + file.name.split('.')[0])
        return true
      })

      wordArrayFiltered.forEach(function(word, index){

        if(exceptionWords.indexOf(word) !== -1 || casualException.indexOf(word) !== -1) return false

        var wordArrayClone = _.clone(wordArrayFiltered)
        wordArrayClone.splice(index, 1)
        wordArrayClone.forEach(function(sinergyWord){
          if(!sinergyWordMap[word]) sinergyWordMap[word] = {}
          if(!sinergyWordMap[word][sinergyWord]) sinergyWordMap[word][sinergyWord] = 0
          sinergyWordMap[word][sinergyWord] += 1
        })
      })

      lineCount += 1
    }
    totalLineCount += 1
  })

  _.each(wordMap, function(wordObject, word){
    var document = {
      word : word, count : wordObject.count, lines : wordObject.lines
    }
    collection.push(document)
  })

  _.each(sinergyWordMap, function(wordObject, word){
    var sinergyCollection = []
    _.each(wordObject, function(sinergyWordCount, word){
      var document = { word : word, count : sinergyWordCount }
      sinergyCollection.push(document)
    })

    sinergyWordMapFiltered[word] = _.sortBy(sinergyCollection, function(document){
      return -document.count
    })

  })

  var orderedCollection = _.sortBy(collection, function(document){
    return -document.count
  })

  var orderedCollectionWithoutLines = orderedCollection.map(function(document){
    return {
      word : document.word, count : document.count
    }
  })

  _.some(orderedCollectionWithoutLines, function(wordAndCount){
    if (sinergyWordMapFiltered[wordAndCount.word]) {
      sinergyWordMapFiltered[wordAndCount.word] = sinergyWordMapFiltered[wordAndCount.word].slice(0, MAX_WORDS_SINERGY)
      sinergyWordMapFiltered[wordAndCount.word].forEach(function(wordAndCountSecond) {
        var document = {}

        document.word = GROUP_WORDS_DICTIONARY[wordAndCount.word] ?
          GROUP_WORDS_DICTIONARY[wordAndCount.word].join(' / ') + ' (' + wordAndCount.count + ')' :
          wordAndCount.word + ' (' + wordAndCount.count + ')'
        document.secondword = wordAndCountSecond.word + ' (' + parseInt(wordAndCountSecond.count * 100 /wordAndCount.count) + '%)'
        document.example = '"' + findPhrase(data, [wordAndCount.word, wordAndCountSecond.word]) + '"'
        finalJsonToCsv.push(document)
      })
    } else {
      finalJsonToCsv.push({ word: wordAndCount.word, secondword: undefined, example: undefined })
    }
    return wordAndCount.count <= parseInt(lineCount * MIN_WORD_COUNT)
  })

  var csv = json2csv({ data: finalJsonToCsv })
  fs.writeFile('./test.csv', csv, function(err){
    console.log('DONE WRITING')
  })

  console.log('LINE COUNT: ', lineCount)
  console.log('TOTAL LINE COUNT: ', totalLineCount)
})