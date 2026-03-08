# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'xn/version'

Gem::Specification.new do |spec|
  spec.name          = "xn"
  spec.version       = Xn::VERSION
  spec.authors       = ["Darrick Wiebe"]
  spec.email         = ["dw@xnlogic.com"]
  spec.summary       = %q{XN Logic internal command-line tools}
  spec.description   = %q{}
  spec.homepage      = "https://xnlogic.com"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 1.7"
  spec.add_development_dependency "rake", "~> 10.0"
end
