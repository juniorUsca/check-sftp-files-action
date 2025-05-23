import path from 'node:path'
import * as core from '@actions/core'

import { Client, type ConnectConfig } from 'ssh2'
import { type FileChecked } from './types'

const remoteDirPath = core.getInput('remote-dir-path')
const host = core.getInput('host')
const port = +core.getInput('port')
const username = core.getInput('username')
const password = core.getInput('password')
const fileNames = core.getInput('file-names')
const filePatterns = core.getInput('file-patterns')
const failIfNoFiles = core.getInput('fail-if-no-files') === 'true'

const filesToCheck = fileNames
  .split(',')
  .map(filename => filename.trim())
  .filter(filename => filename !== '')

const filePatternsToCheck = filePatterns
  .split(',')
  .map(filePattern => filePattern.trim())
  .filter(filePattern => filePattern !== '')
  .map(filePattern => new RegExp(filePattern))

const credentials: ConnectConfig = {
  host,
  port,
  username,
  password,
}

console.log(`It will be attempted to download the files with the following file-patterns: ${filePatterns}`)
console.log(`It will be attempted to download the files with the following file-names: ${fileNames}`)

if (filesToCheck.length === 0 && filePatternsToCheck.length === 0) {
  console.log('No files provided to check')
  console.log('Please provide at least one file name or file pattern to check')
  core.setFailed('No files provided to check')
  throw new Error('No files provided to check')
}

const conn = new Client()
conn.on('ready', () => {
  console.log('SFTP Client :: ready')
  conn.sftp((err, sftp) => {
    if (err){
      core.setFailed(err.message)
      throw err
    }

    sftp.readdir(remoteDirPath, (errReadDir, allFiles) => {
      if (errReadDir){
        conn.end()
        core.setFailed(errReadDir.message)
        throw errReadDir
      }

      const listChecked: FileChecked[] = allFiles
        .filter(file => {
          const inFileNames = filesToCheck.some(fileInput => fileInput === file.filename)
          const inFilePatterns = filePatternsToCheck.some(pattern => file.filename.match(pattern) !== null)
          return inFileNames || inFilePatterns
        })
        .map(file => ({
          filename: file.filename,
          remotePath: path.posix.join(remoteDirPath, file.filename),
          size: file.attrs.size,
        }))

      const listNotFound = filesToCheck.filter(fileInput => !listChecked.some(file => file.filename === fileInput))
      const listNotFoundPatterns = filePatternsToCheck
        .filter(pattern => !listChecked.some(file => file.filename.match(pattern) !== null))
        .map(pattern => pattern.source)

      core.setOutput('file-names', JSON.stringify(
        listChecked.map(file => file.filename)
      ))
      core.setOutput('file-names-not-found', JSON.stringify(
        listNotFound
      ))
      core.setOutput('file-patterns', JSON.stringify(
        filePatternsToCheck
          .filter(pattern => listChecked.some(file => file.filename.match(pattern) !== null))
          .map(pattern => pattern.source)
      ))
      core.setOutput('file-patterns-not-found', JSON.stringify(
        listNotFoundPatterns
      ))

      if (listNotFound.length > 0) {
        console.log('Some file names were not found in the remote directory')
        console.log('Number of files not found:', listNotFound.length)
        console.log('Files not found:', listNotFound.join(', '))

        if (failIfNoFiles) {
          console.log('Number of files found:', listChecked.length)
          console.log('Files found:', listChecked.map(file => file.filename).join(', '))
          console.log('-------------------------')
          console.log('Failing the action because some file names were not found in the remote directory')
          core.setFailed('Some file names were not found in the remote directory')

          conn.end()
          return
        }
      }
      if (listNotFoundPatterns.length > 0) {
        console.log('Some file patterns were not found in the remote directory')
        console.log('Number of file patterns not found:', listNotFoundPatterns.length)
        console.log('File patterns not found:', listNotFoundPatterns.join(', '))

        if (failIfNoFiles) {
          console.log('Number of files found:', listChecked.length)
          console.log('Files found:', listChecked.map(file => file.filename).join(', '))
          console.log('-------------------------')
          console.log('Failing the action because some file patterns were not found in the remote directory')
          core.setFailed('Some file patterns were not found in the remote directory')

          conn.end()
          return
        }
      }

      if (listChecked.length === 0) {
        console.log('No files found in the remote directory')
        console.log(`Files in remote directory: ${remoteDirPath}`, allFiles.map(file => file.filename).join(', '))

        conn.end()
        if (failIfNoFiles){
          console.log('Failing the action because no files were found in the remote directory')
          core.setFailed('No files found')
        }
        return
      }

      console.log('Number of files found:', listChecked.length)
      console.log('Files found:', listChecked.map(file => file.filename).join(', '))

      conn.end()
    })

  })
})
conn.on('error', err => {
  console.error(`Error caught, ${err}`)
  core.setFailed(err.message)
  throw err
})
conn.connect(credentials)
