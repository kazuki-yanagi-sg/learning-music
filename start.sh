#!/bin/bash
# アニソン作曲学習アプリ - 一発起動スクリプト
#
# 使い方: ./start.sh
#
# 構成:
#   - frontend: Docker (port 5173)
#   - voicevox: Docker (port 50021)
#   - backend: ホスト実行 (port 8000) - Demucs/PyTorchのMPS対応のため

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 色付き出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Pythonバージョンチェック
check_python() {
    # Python 3.11 または 3.12 を探す
    if command -v python3.12 &> /dev/null; then
        PYTHON_CMD="python3.12"
    elif command -v python3.11 &> /dev/null; then
        PYTHON_CMD="python3.11"
    else
        # デフォルトのpython3のバージョンを確認
        PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
        if [[ "$PY_VERSION" == "3.11" || "$PY_VERSION" == "3.12" ]]; then
            PYTHON_CMD="python3"
        else
            echo_error "Python 3.11 または 3.12 が必要です (現在: $PY_VERSION)"
            echo_info "インストール方法:"
            echo "  brew install python@3.12"
            exit 1
        fi
    fi
    echo_info "Python: $($PYTHON_CMD --version)"
}

# 環境変数チェック
check_env() {
    if [ ! -f .env ]; then
        echo_error ".env ファイルが見つかりません"
        echo_info ".env.example をコピーして設定してください:"
        echo "  cp .env.example .env"
        echo "  # .env を編集してAPIキーを設定"
        exit 1
    fi

    # .envを読み込み
    set -a
    source .env
    set +a

    if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
        echo_error "GEMINI_API_KEY が設定されていません"
        exit 1
    fi

    if [ -z "$YOUTUBE_API_KEY" ] || [ "$YOUTUBE_API_KEY" = "your_youtube_api_key_here" ]; then
        echo_error "YOUTUBE_API_KEY が設定されていません"
        exit 1
    fi
}

# Python仮想環境のセットアップ
setup_venv() {
    if [ ! -d "backend/.venv" ]; then
        echo_info "Python仮想環境を作成中..."
        $PYTHON_CMD -m venv backend/.venv
    fi

    source backend/.venv/bin/activate

    # 依存関係のインストール確認
    if ! pip show fastapi &> /dev/null; then
        echo_info "Python依存関係をインストール中..."
        pip install --upgrade pip

        # PyTorch (Apple Silicon MPS対応)
        echo_info "PyTorch をインストール中..."
        pip install torch torchaudio

        # Demucs のインストール
        echo_info "Demucs をインストール中..."

        # lameenc のビルドに必要な lame をインストール
        if ! command -v lame &> /dev/null; then
            echo_info "LAME をインストール中 (Homebrew)..."
            brew install lame
        fi

        # lameenc をソースからビルド
        LIBRARY_PATH="/opt/homebrew/lib" CPATH="/opt/homebrew/include" pip install lameenc || echo_warn "lameenc インストール失敗（MP3出力不可、WAVは動作）"

        pip install demucs

        # 残りの依存関係
        pip install -r backend/requirements.txt

        # TensorFlowをアンインストール（Basic PitchがCoreMを使うように）
        # TensorFlow 2.16+はBasic Pitchのモデルと互換性がないため
        echo_info "TensorFlowを削除中（CoreMLを優先）..."
        pip uninstall tensorflow tensorflow-intel tensorflow-io-gcs-filesystem keras -y 2>/dev/null || true
    fi

    # autochord の個別チェック（後から追加された依存関係）
    if ! pip show autochord &> /dev/null; then
        echo_info "autochord をインストール中（和音認識用）..."
        pip install autochord || echo_warn "autochord インストール失敗（和音認識なしで動作）"
    fi
}

# Dockerサービス起動
start_docker_services() {
    echo_info "Docker サービスを起動中 (frontend, voicevox)..."
    docker-compose up -d frontend voicevox

    # VOICEVOXの起動待ち
    echo_info "VOICEVOX の起動を待機中..."
    for i in {1..30}; do
        if curl -s http://localhost:50021/version > /dev/null 2>&1; then
            echo_info "VOICEVOX 起動完了"
            break
        fi
        sleep 1
    done
}

# バックエンド起動
start_backend() {
    echo_info "Backend を起動中 (ホスト実行 - MPS対応)..."

    # ホスト実行用の環境変数を設定
    export VOICEVOX_HOST=http://localhost:50021
    export FRONTEND_URL=http://localhost:5173
    export ANISONG_AUDIO_DIR="$SCRIPT_DIR/storage/audio"
    export ANISONG_MIDI_DIR="$SCRIPT_DIR/storage/midi"

    # ストレージディレクトリ作成
    mkdir -p "$SCRIPT_DIR/storage/audio"
    mkdir -p "$SCRIPT_DIR/storage/midi"

    cd backend
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
}

# クリーンアップ
cleanup() {
    echo ""
    echo_info "シャットダウン中..."
    docker-compose down
    exit 0
}

# Ctrl+C でクリーンアップ
trap cleanup SIGINT SIGTERM

# メイン処理
main() {
    echo "========================================"
    echo "  アニソン作曲学習アプリ"
    echo "========================================"
    echo ""

    check_python
    check_env
    setup_venv
    start_docker_services

    echo ""
    echo_info "起動完了!"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo ""
    echo_info "終了するには Ctrl+C を押してください"
    echo ""

    start_backend
}

main
