var fs = require('fs')
var _ = require('lodash')
var async = require('async')

var files = [{name: '2014.csv', index: 43}, {name: '2015.csv', index: 39}, {name: '2016.csv', index: 39}]

var wordMap = {}
var collection = []

var exceptionWords = ['', 'de', 'mais', 'do', 'e', 'para', 'o', 'a', 'com', 'um', 'que', 'em', 'os', 'da', 'ser', 'ter',
'no', 'uma', 'na', 'dos', 'do', 'por', 'está', 'as', 'é', 'ou']

var casualException = ['curso', 'aula', 'cursos', 'aulas']
var lineCount = 0

function groupWordMelhorias (word) {
  if (['tempo', 'duração', 'horas'].indexOf(word) !== -1 ) return 'tempo'
  if (['disponibilizar', 'disponibilização', 'disponibilizado', 'disponibilidade'].indexOf(word) !== -1 ) return 'disponibilizar'
  if (['prática', 'práticas', 'práticos', 'prático', 'pratica', 'praticas', 'praticos', 'pratico'].indexOf(word) !== -1 ) return 'pratica'
  if (['horário', 'horária', 'horários', 'horario', 'horaria', 'horarios'].indexOf(word) !== -1 ) return 'horario'
  if (['dinâmica', 'dinâmicas', 'dinamica', 'dinamicas'].indexOf(word) !== -1 ) return 'dinamica'

  return word
}

async.eachSeries(files, function(file, callback) {

  fs.readFile('./' + file.name, 'utf-8', function(err, data) {
    data = data.split('\n')
    data.forEach(function(line, index) {
      if (index === 0) return

      var response = line.split(',')[file.index]
      var wordArray = response.split(' ')
      if (wordArray.length > 1 || wordArray[0] !== '') {
        wordArray.forEach(function(word) {
          var formattedWord = word.toLowerCase()
          if (formattedWord[formattedWord.length - 1] === '.') formattedWord = formattedWord.replace(/\./, '')

          if (exceptionWords.indexOf(formattedWord) !== -1 || casualException.indexOf(formattedWord) !== -1) return

          //formattedWord = groupWord(formattedWord)

          if(!wordMap[formattedWord]) wordMap[formattedWord] = {count : 0, lines : []}
          wordMap[formattedWord]['count'] += 1
          wordMap[formattedWord]['lines'].push(index + file.name.split('.')[0])
        })
        lineCount += 1
      }
    })

    callback()
  })
}, function() {

  _.each(wordMap, function(wordObject, word){
    var document = {
      word: word,
      count: wordObject.count,
      lines: wordObject.lines
    }
    collection.push(document)
  })

  var orderedCollection = _.sortBy(collection, function (document) {
    return - document.count
  })

  var orderedCollectionWithoutLines = orderedCollection.map(function (document) {
    return {
      word : document.word,
      count: document.count
    }
  })
  console.log(orderedCollectionWithoutLines)
  console.log('LINE COUNT: ', lineCount)
})