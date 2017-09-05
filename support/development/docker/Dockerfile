FROM node:6.11.2

# Setup initial dependencies
RUN apt-get update && apt-get install -y \
        python-crypto \
	python-serial \
	python-netifaces \
	python-magic \
    && rm -rf /var/lib/apt/lists/*

# Create necessary folders
RUN mkdir -p /opt/bits && \
    mkdir -p /var/bits && \
    chown node:node /var/bits && \
    chmod -R go-rwX /var/bits

# Execute commands out of the /opt/bits folder
WORKDIR /opt/bits

# Establish /var/bits as a volume so that 
# any files added here during build/test are
# not included in the image.  This also ensures
# that at run time a user can managed modules
# independent of contianer lifecycle
VOLUME /var/bits

# To improve Docker cache behaviour during development
# setup node_modules, yarn, and bower before adding
# the BITS packages
ADD package.json module.json bower.json .bowerrc /opt/bits/

# Install node modules
RUN npm install

# Execute yarn and bower directly so that the --allow-root
# argument can be included on the bower command line
RUN yarn && \
    ./node_modules/bower/bin/bower --allow-root install

# Add the rest of the BITS source code
ADD . /opt/bits

# lint and build bits
RUN npm run lint && npm run test

# By default use the BITS development ports
ENV HTTP_PORT 9000
ENV HTTPS_PORT 9001

# Expose these
EXPOSE 9000 9001

# Make sure the /var/bits folder is owned/accessible by node
RUN chown node:node /var/bits && \
    chmod -R go-rwX /var/bits

# Run as the node user
USER node

# use NPM to start the application so Ctrl-C is handled correctly
# when 'docker run -it' is used
CMD [ "npm", "run", "start", "--", "-v", "-d", "/var/bits" ]
