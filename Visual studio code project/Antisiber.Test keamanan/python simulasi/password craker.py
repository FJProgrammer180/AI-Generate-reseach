import subprocess
profiles = subprocess.check_output('netsh wlan show profiles',
                                    shell=True).decode()

names = [line.split(":")[1].strip() for line in profiles.split('\n') if "All User Profile" in line]