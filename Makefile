
zip:
	npm run build
	rm braincache.zip
	pushd dist && zip -r ../braincache.zip . && popd
