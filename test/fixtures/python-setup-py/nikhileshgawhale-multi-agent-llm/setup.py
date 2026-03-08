#!/usr/bin/env python3
"""
Setup script for the Multi-Agent LLM Workflow Assistant.
This script handles virtual environment creation, dependency installation, and initial setup.
"""

import os
import sys
import subprocess
import platform
import venv
from pathlib import Path


def check_python_version():
    """Check if Python version is compatible."""
    print("🔍 Checking Python version...")
    
    if sys.version_info < (3, 9):
        print(f"❌ Python {sys.version} is not supported. Please use Python 3.9 or higher.")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor} is compatible")
    return True


def create_virtual_environment():
    """Create a virtual environment."""
    print("🔧 Creating virtual environment...")
    
    venv_path = Path("venv")
    
    if venv_path.exists():
        print("⚠️  Virtual environment already exists")
        response = input("Do you want to recreate it? (y/n): ")
        if response.lower() == 'y':
            import shutil
            shutil.rmtree(venv_path)
        else:
            print("Using existing virtual environment")
            return venv_path
    
    try:
        venv.create(venv_path, with_pip=True)
        print("✅ Virtual environment created successfully")
        return venv_path
    except Exception as e:
        print(f"❌ Error creating virtual environment: {e}")
        return None


def get_python_executable(venv_path):
    """Get the Python executable path for the virtual environment."""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "python.exe"
    else:
        return venv_path / "bin" / "python"


def get_pip_executable(venv_path):
    """Get the pip executable path for the virtual environment."""
    if platform.system() == "Windows":
        return venv_path / "Scripts" / "pip.exe"
    else:
        return venv_path / "bin" / "pip"


def upgrade_pip(venv_path):
    """Upgrade pip in the virtual environment."""
    print("⬆️  Upgrading pip...")
    
    pip_executable = get_pip_executable(venv_path)
    
    try:
        subprocess.run([
            str(pip_executable), "install", "--upgrade", "pip"
        ], check=True, capture_output=True, text=True)
        print("✅ Pip upgraded successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error upgrading pip: {e}")
        return False


def install_dependencies(venv_path):
    """Install project dependencies."""
    print("📦 Installing dependencies...")
    
    pip_executable = get_pip_executable(venv_path)
    requirements_file = Path("requirements.txt")
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    try:
        # Install dependencies
        result = subprocess.run([
            str(pip_executable), "install", "-r", str(requirements_file)
        ], check=True, capture_output=True, text=True)
        
        print("✅ Dependencies installed successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        print(f"Error output: {e.stderr}")
        return False


def create_env_file():
    """Create .env file from template."""
    print("📝 Setting up environment configuration...")
    
    env_example = Path("env.example")
    env_file = Path(".env")
    
    if not env_example.exists():
        print("❌ env.example not found")
        return False
    
    if env_file.exists():
        print("⚠️  .env file already exists")
        response = input("Do you want to overwrite it? (y/n): ")
        if response.lower() != 'y':
            print("Using existing .env file")
            return True
    
    try:
        # Copy env.example to .env
        with open(env_example, 'r') as f:
            content = f.read()
        
        with open(env_file, 'w') as f:
            f.write(content)
        
        print("✅ .env file created from template")
        print("⚠️  Please edit .env file and add your OpenAI API key")
        return True
        
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False


def check_redis_installation():
    """Check if Redis is installed and provide installation instructions."""
    print("🔍 Checking Redis installation...")
    
    try:
        # Try to import redis
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis is running")
        return True
    except ImportError:
        print("❌ Redis Python package not installed")
        return False
    except Exception:
        print("⚠️  Redis server is not running")
        print("\n📋 Redis Installation Instructions:")
        
        system = platform.system().lower()
        
        if system == "windows":
            print("Windows:")
            print("1. Download Redis from: https://github.com/microsoftarchive/redis/releases")
            print("2. Install Redis")
            print("3. Start Redis server: redis-server")
        elif system == "darwin":  # macOS
            print("macOS:")
            print("1. Install with Homebrew: brew install redis")
            print("2. Start Redis server: brew services start redis")
        else:  # Linux
            print("Linux (Ubuntu/Debian):")
            print("1. Install Redis: sudo apt-get install redis-server")
            print("2. Start Redis server: sudo systemctl start redis-server")
        
        print("\nOr use Docker:")
        print("docker run -d -p 6379:6379 redis:alpine")
        
        return False


def create_directories():
    """Create necessary directories."""
    print("📁 Creating necessary directories...")
    
    directories = [
        "chroma_db",
        "logs",
        "data"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
    
    print("✅ Directories created successfully")


def run_tests(venv_path):
    """Run basic tests to verify installation."""
    print("🧪 Running basic tests...")
    
    python_executable = get_python_executable(venv_path)
    
    try:
        # Test imports
        test_script = """
import sys
print("Testing imports...")

try:
    import fastapi
    print("✅ FastAPI imported successfully")
except ImportError as e:
    print(f"❌ FastAPI import failed: {e}")

try:
    import streamlit
    print("✅ Streamlit imported successfully")
except ImportError as e:
    print(f"❌ Streamlit import failed: {e}")

try:
    import redis
    print("✅ Redis imported successfully")
except ImportError as e:
    print(f"❌ Redis import failed: {e}")

try:
    import chromadb
    print("✅ ChromaDB imported successfully")
except ImportError as e:
    print(f"❌ ChromaDB import failed: {e}")

try:
    import openai
    print("✅ OpenAI imported successfully")
except ImportError as e:
    print(f"❌ OpenAI import failed: {e}")

print("\\nImport tests completed!")
"""
        
        result = subprocess.run([
            str(python_executable), "-c", test_script
        ], check=True, capture_output=True, text=True)
        
        print(result.stdout)
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Test failed: {e}")
        print(f"Error output: {e.stderr}")
        return False


def main():
    """Main setup function."""
    print("🤖 Multi-Agent LLM Workflow Assistant - Setup")
    print("=" * 60)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Create virtual environment
    venv_path = create_virtual_environment()
    if not venv_path:
        sys.exit(1)
    
    # Upgrade pip
    if not upgrade_pip(venv_path):
        print("⚠️  Pip upgrade failed, continuing anyway...")
    
    # Install dependencies
    if not install_dependencies(venv_path):
        print("❌ Dependency installation failed")
        sys.exit(1)
    
    # Create .env file
    if not create_env_file():
        print("❌ Environment setup failed")
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Check Redis
    check_redis_installation()
    
    # Run tests
    if not run_tests(venv_path):
        print("❌ Tests failed")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit .env file and add your OpenAI API key")
    print("2. Start Redis server (if not already running)")
    print("3. Activate virtual environment:")
    
    if platform.system() == "Windows":
        print("   venv\\Scripts\\activate")
    else:
        print("   source venv/bin/activate")
    
    print("4. Run the application:")
    print("   python start.py")
    
    print("\n🌐 Once running, access:")
    print("   - Web Interface: http://localhost:8501")
    print("   - API Documentation: http://localhost:8000/docs")
    
    print("\n📚 For more information, see README.md")


if __name__ == "__main__":
    main() 