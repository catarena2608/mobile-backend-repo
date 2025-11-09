pipeline {
    agent any

    // === 1. ĐỊNH NGHĨA THAM SỐ LỰA CHỌN ===
    parameters {
        choice(
            name: 'SERVICE_TO_BUILD',
            // Liệt kê các service của bạn từ image_76a8f6.png
            choices: [
                'BackEnd_auth', 
                'BackEnd_post', 
                'BackEnd_recipe', 
                'BackEnd_user', 
                'gateway'
            ],
        )
    }

    // === Các biến môi trường chung ===
    environment {
        GCP_PROJECT_ID     = 'mobile-project-477308' // Thay nếu cần
        DOCKERHUB_USERNAME = 'catarena' // Thay bằng tên bạn
        GCP_REGION         = 'asia-southeast1'       // Region deploy
    }

    stages {

        stage('Checkout') {
            steps {
                echo "Building service: ${params.SERVICE_TO_BUILD}" 
                checkout scm
            }
        }
        
        // === 2. GIAI ĐOẠN BUILD VÀ PUSH (LINH HOẠT) ===
        stage('Build, Push, Deploy') {
            steps {
                // 'script' cho phép chúng ta dùng logic (như if/else)
                script {
                    // 1. Lấy service_name GỐC (ví dụ: 'BackEnd_auth')
                    def serviceName = params.SERVICE_TO_BUILD 

                    // 2. Thư mục (ví dụ: 'BackEnd_auth')
                    def serviceDir = "${serviceName}" 

                    // 3. Tên Image (ví dụ: 'catarena/backend_auth:latest')
                    def imageName = "${DOCKERHUB_USERNAME}/${serviceName.toLowerCase()}:${env.BUILD_NUMBER}"

                    //    -> Đổi sang chữ thường VÀ thay thế _ bằng -
                    def deployName = serviceName.toLowerCase().replaceAll('_', '-')

                    echo "Bắt đầu build cho service: ${serviceName}"
                    echo "Thư mục: ${serviceDir}"
                    echo "Image: ${imageName}"
                    echo "Tên Deploy Cloud Run: ${deployName}" // Sẽ in ra 'backend-auth'

                    // 1. Build Image
                    dir(serviceDir) {
                        echo "Đang build image..."
                        sh "docker build --no-cache -t ${imageName} ."
                    }

                    // 2. Push lên Docker Hub
                    withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        echo "Đang đăng nhập và đẩy (push) image..."
                        
                        sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                        
                        sh "docker push ${imageName}"
                    }

                    // 3. Deploy lên Cloud Run
                    withCredentials([file(credentialsId: 'gcp-service-account', variable: 'GCP_KEY_FILE')]) {
                        echo "Đang xác thực GCP và deploy..."
                        
                        sh 'gcloud auth activate-service-account --key-file $GCP_KEY_FILE'
                        
                        sh "gcloud config set project ${GCP_PROJECT_ID}"
                        
                        sh "gcloud run deploy ${deployName} --image ${imageName} --region ${GCP_REGION} --platform managed --allow-unauthenticated --port 8080 "
                    }
                }
            }
        }
    }

    // === Giai đoạn cuối: Dọn dẹp ===
    post {
        always {
            echo 'Build hoàn tất. Đang dọn dẹp...'
            sh 'docker logout'
            cleanWs()
        }
    }
}