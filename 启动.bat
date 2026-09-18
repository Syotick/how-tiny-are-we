@echo off
setlocal
title 人类有多渺小 · 一键启动

REM ============================================================
REM   人类有多渺小 · How Tiny Are We —— 一键启动器
REM   自动完成：检查 Node.js -> 安装依赖 -> 构建数据 -> 启动服务器
REM   用法：双击本文件即可
REM ============================================================

cd /d "%~dp0"

echo.
echo  ============================================
echo    人类有多渺小 · How Tiny Are We
echo    一键启动器
echo  ============================================
echo.

REM ---------- 1. 检查 Node.js ----------
where node >nul 2>nul
if errorlevel 1 (
    echo  [错误] 未检测到 Node.js！
    echo         请先安装：https://nodejs.org/  安装后重新运行本脚本。
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set "NODE_VER=%%v"
echo  [1/4] 检测到 Node.js %NODE_VER%

REM ---------- 2. 安装依赖（首次运行） ----------
if not exist "node_modules" (
    echo  [2/4] 首次运行，正在安装依赖，请稍候（可能需要几分钟）...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [错误] 依赖安装失败，请检查网络后重新运行。
        pause
        exit /b 1
    )
    echo.
    echo  [2/4] 依赖安装完成。
) else (
    echo  [2/4] 依赖已就绪。
)

REM ---------- 3. 构建数据（数据文件缺失时自动重建） ----------
if not exist "public\data\objects.json" (
    echo  [3/4] 未找到数据文件，正在用已提交的原始数据重建...
    call npm run data:build
    if errorlevel 1 (
        echo  [错误] 数据构建失败。
        pause
        exit /b 1
    )
    echo  [3/4] 数据构建完成。
) else (
    echo  [3/4] 数据文件已就绪。
)

REM ---------- 4. 启动开发服务器并打开浏览器 ----------
echo  [4/4] 正在启动本地服务器，浏览器将自动打开…
echo.
echo  提示：
echo    - 地址为 http://localhost:5173 （被占用时自动改用其它端口）
echo    - 按 Ctrl+C 可停止服务器
echo    - 关闭本窗口也会结束服务器
echo.
npm run dev -- --open

echo.
echo  服务器已停止。
pause
