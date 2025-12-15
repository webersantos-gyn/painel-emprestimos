@echo off
title Painel Emprestimos - Servidor Mobile
cls
echo ========================================================
echo        INICIANDO SERVIDOR PARA ACESSO NO CELULAR
echo ========================================================
echo.
echo [PASSO 1] Garanta que seu celular esteja no mesmo Wi-Fi.
echo.
echo [PASSO 2] Procure abaixo a linha "Endereço IPv4" (ex: 192.168.0.15)
echo           O endereço de acesso será: http://SEU_IP:8080
echo.
echo --------------------------------------------------------
ipconfig | findstr "IPv4"
echo --------------------------------------------------------
echo.
echo Iniciando servidor... (Se pedir confirmacao para instalar http-server, digite 'y')
echo.
call npx http-server . -c-1 -a 0.0.0.0 -p 8080
pause
