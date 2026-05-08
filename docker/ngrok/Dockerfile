FROM ngrok/ngrok:latest

# Copy the configuration file to the container
COPY ngrok.yml /etc/ngrok.yml

# Start all tunnels defined in the config file
ENTRYPOINT ["ngrok", "start", "--all", "--config", "/etc/ngrok.yml"]
