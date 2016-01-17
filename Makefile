PACKAGE=scrollzoom@ikkoku.de.zip

all: $(PACKAGE)

clean:
	-rm $(PACKAGE)

$(PACKAGE): metadata.json extension.js
	zip $(PACKAGE) $+
