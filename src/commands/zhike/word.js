const { Utils } = require('zignis')
const { components } = require('../../../')
const co = require('co')
const inquirer = require('inquirer')
const _ = require('lodash')
const path = require('path')
const debug = require('debug')('zignis-plugin-zhike:word')

const getRandomQustion = function*(models) {
  const { Word, Question } = models
  const hardQuestionIds = (yield Question.findAll({
    attributes: ['id'],
    where: { type: 1, status: 1 },
    include: [
      {
        model: Word,
        required: true
      }
    ]
  })).map(el => el.id)

  let question = null
  while (!question) {
    const questionId = hardQuestionIds[Utils.random(0, hardQuestionIds.length - 1)]
    question = yield Question.findOne({
      attributes: ['choices', 'answer', 'wordId'],
      where: { id: questionId },
      nest: true,
      include: [
        {
          model: Word,
          attributes: ['name']
        }
      ]
    })
    try {
      question.choices = JSON.parse(question.choices)
      const result = {
        name: _.trim(question.Word.name),
        choices: question.choices,
        answer: question.answer,
        wordId: question.wordId
      }
      if (result.name && result.choices) {
        result.name = `"${result.name}"的意思是？`
        return result
      }
      question = null // 有内容为空，不符合条件
    } catch (error) {
      question = null
    }
  }
}

exports.command = 'word [word]'
exports.desc = 'zhike personal word test'
// exports.alias = ''

exports.builder = function(yargs) {
  // yargs.option('option', {default, describe, alias})
}

exports.handler = function(argv) {
  co(function*() {
    const { db } = yield components()
    const wordDb = yield db.load('db.word', 'word', db.associate(path.resolve(__dirname, '../../models/word')))
    const { Word } = wordDb.models

    if (argv.word) {
      const word = yield Word.findOne({
        raw: true,
        where: {
          name: `${argv.word}`
        }
      })

      if (!word) {
        console.log(Utils.chalk.red('Word not found!'))
      } else {
        const wordTable = []
        wordTable.push(['name', word.name])
        wordTable.push(['american_phonetic_symbol', word.americanPhoneticSymbol])
        wordTable.push(['english_phonetic_symbol', word.englishPhoneticSymbol])
        wordTable.push([
          'explanation',
          JSON.parse(word.explanation)
            .map(w => `${w.pro} ${w.content}`)
            .join('|')
        ])
        wordTable.push(['english_description', word.englishDescription])
        Utils.log(wordTable)
      }

      process.exit(0)
    }

    const stat = {
      total: 0,
      correct: 0
    }

    while (true) {
      const question = yield getRandomQustion(wordDb.models)

      debug('Origin', question.choices)
      debug('Answer', question.answer)

      const splicedChoices = question.choices.splice(question.answer - 1, 1)
      debug('WrongChoices', question.choices)

      const randomChoices = _.shuffle(question.choices)
      debug('RandomChoices', randomChoices)

      const randomCorrectPlace = Utils.random(0, question.choices.length - 1)
      debug('RandomCorrectPlace', randomCorrectPlace)

      question.choices.splice(randomCorrectPlace, 0, splicedChoices[0])
      debug('FinalChoices', question.choices)

      const answers = yield inquirer.prompt([
        {
          type: 'list',
          name: 'selected',
          message: question.name,
          choices: question.choices.map((v, k) => {
            return { name: v, value: k }
          }),
          validate: function(answers) {
            if (answers.length < 1) {
              return 'Please choose at least one.'
            }
            return true
          }
        }
      ])

      stat.total++
      if (randomCorrectPlace === answers.selected) {
        stat.correct++
        console.log(Utils.chalk.green(`Correct! (total: ${stat.total}, correct: ${stat.correct})`))
      } else {
        console.log(Utils.chalk.red(`Wrong! (total: ${stat.total}, correct: ${stat.correct})`))

        const correctWord = yield Word.findOne({
          raw: true,
          where: {
            id: question.wordId
          }
        })

        const correctWordTable = []
        correctWordTable.push(['name', correctWord.name])
        correctWordTable.push(['american_phonetic_symbol', correctWord.americanPhoneticSymbol])
        correctWordTable.push(['english_phonetic_symbol', correctWord.englishPhoneticSymbol])
        correctWordTable.push([
          'explanation',
          JSON.parse(correctWord.explanation)
            .map(w => `${w.pro} ${w.content}`)
            .join('|')
        ])
        correctWordTable.push(['english_description', correctWord.englishDescription])
        Utils.log(correctWordTable)
      }

      console.log('')
    }
  }).catch(e => {
    Utils.error(e.stack)
  })
}
