#!/usr/bin/env groovy

def dockerRegistry = "329802642264.dkr.ecr.eu-west-1.amazonaws.com"
def nodeImageVersion = "0.0.5"
def nodeImage = "${dockerRegistry}/bbc-news/node-8-lts:${nodeImageVersion}"
def nodeName
def stageName = ""
def packageName = 'simorgh.zip'
def getCommitInfo = {
  infraGitCommitAuthor = sh(returnStdout: true, script: "git --no-pager show -s --format='%an' ${GIT_COMMIT}").trim()
  appGitCommit = sh(returnStdout: true, script: "cd ${APP_DIRECTORY}; git rev-parse HEAD")
  appGitCommitAuthor = sh(returnStdout: true, script: "cd ${APP_DIRECTORY}; git --no-pager show -s --format='%an' ${appGitCommit}").trim()
  appGitCommitMessage = sh(returnStdout: true, script: "cd ${APP_DIRECTORY}; git log -1 --pretty=%B").trim()
}

pipeline {
  agent any
  options {
    timeout(time: 60, unit: 'MINUTES')
    timestamps ()
  }
  environment {
    APP_DIRECTORY = "app"
    CI = true
  }
  stages {
    stage('Checkout application repo') {
      when {
        expression { env.BRANCH_NAME != 'latest' }
      }
      agent {
        docker {
          image "${nodeImage}"
          args '-u root -v /etc/pki:/certs'
        }
      }
      steps {
        sh "rm -rf ${env.APP_DIRECTORY}"
        checkout([
          $class: 'GitSCM',
          branches: [[name: "*/${env.BRANCH_NAME}"]],
          doGenerateSubmoduleConfigurations: false,
          extensions: [[
            $class: 'RelativeTargetDirectory',
            relativeTargetDir: "${env.APP_DIRECTORY}"
          ]],
          submoduleCfg: [],
          userRemoteConfigs: [[
            credentialsId: 'github',
            name: "origin/${env.BRANCH_NAME}",
            url: 'https://github.com/bbc/simorgh.git'
          ]]
        ])
        script {
          getCommitInfo()
          nodeName = "${env.node_name}".toString()
        }
      }
      post {
        always {
          script {
            stageName = env.STAGE_NAME
          }
        }
      }
    }
    stage ('Build and Test') {
      when {
        expression { env.BRANCH_NAME != 'latest' }
      }
      parallel {
        stage('Test Development') {
          agent {
            docker {
              image "${nodeImage}"
              label nodeName
              args '-u root -v /etc/pki:/certs'
            }
          }
          steps {
            sh 'make install'
            sh 'make developmentTests'
          }
        }

        stage('Test Production') {
          agent {
            docker {
              image "${nodeImage}"
              label nodeName
              args '-u root -v /etc/pki:/certs'
            }
          }
          steps {
            // Testing
            sh 'make installProd'
            sh 'make productionTests'
          }
        }    
      }
      post {
        always {
          script {
            stageName = env.STAGE_NAME
          }
        }
      }
    }
    stage ('Build, Test & Package') {
      when {
        expression { env.BRANCH_NAME == 'latest' }
      }
      parallel {
        stage('Test Development') {
          agent {
            docker {
              image "${nodeImage}"
              label nodeName
              args '-u root -v /etc/pki:/certs'
            }
          }
          steps {
            sh 'make install'
            sh 'make developmentTests'
          }
        }

        stage('Test Production and Zip Production') {
          agent {
            docker {
              image "${nodeImage}"
              label nodeName
              args '-u root -v /etc/pki:/certs'
            }
          }
          steps {
            // Testing
            sh 'make installProd'
            sh 'make productionTests'
            // Moving files necessary for production to `pack` directory.
            sh "./scripts/jenkinsProductionFiles.sh"
            sh "rm -f ${packageName}"
            zip archive: true, dir: 'pack/', glob: '', zipFile: packageName
            stash name: 'simorgh', includes: packageName
          }
        }    
      }
      post {
        always {
          script {
            stageName = env.STAGE_NAME
          }
        }
      }
    }
    stage ('Run Pipeline') {
      when {
        expression { env.BRANCH_NAME == 'latest' }
      }
      options {
        // Do not perform the SCM step
        skipDefaultCheckout true
      }
      agent any
      steps {
        unstash 'simorgh'
        build(
          job: 'simorgh-infrastructure/latest',
          parameters: [
            [$class: 'StringParameterValue', name: 'BRANCH', value: env.BRANCH_NAME],
            [$class: 'StringParameterValue', name: 'APPLICATION_BRANCH', value: env.BRANCH_NAME],
            [$class: 'StringParameterValue', name: 'ENVIRONMENT', value: 'live'],
          ],
          propagate: true,
          wait: true
        )
      }
    }
  }
}
