from setuptools import setup, find_packages

setup(
    name="lib763",
    version="1.4",
    description="naru's library",
    author="naru",
    license="MIT",
    install_requires=[
        "paramiko",
        "scp",
        "chardet",
        "opencv-python",
        "keyboard",
        "mouse",
        "pyperclip",
        "pyautogui",
        "pygetwindow",
        "requests",
        "tqdm",
        "pytest",
    ],
)
